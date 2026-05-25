const crypto = require('crypto');

const DEFAULT_ROUTE_LIMITS = {
  general: { max: 300, windowMs: 60_000 },
  microsite: { max: 500, windowMs: 60_000 },
  booking: { max: 200, windowMs: 60_000 },
  registration: { max: 100, windowMs: 60_000 },
  admin: null,
};

const KNOWN_QUEUE_GROUPS = ['general', 'microsite', 'booking', 'registration'];

function deriveRouteGroupFromPath(urlPath = '') {
  const path = String(urlPath || '');
  if (/^\/api\/temple\/register\b/.test(path) || /^\/api\/register\b/.test(path)) return 'registration';
  if (
    /^\/api\/booking\b/.test(path) ||
    /^\/api\/bookings\b/.test(path) ||
    /^\/api\/temple\/[^/]+\/bookings\b/.test(path)
  ) {
    return 'booking';
  }
  if (/^\/temple\/[^/]+/.test(path) || /^\/api\/temple\/[^/]+/.test(path)) return 'microsite';
  if (/\/admin\b/.test(path) || /admin\.html$/.test(path) || /^\/api\/admin\b/.test(path)) return 'admin';
  return 'general';
}

function isHtmlRequest(req) {
  const accept = String(req.headers?.accept || '');
  return accept.includes('text/html');
}

function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

async function runSlidingWindowRateLimit({
  redis,
  key,
  nowMs = Date.now(),
  maxRequests,
  windowMs,
}) {
  const member = `${nowMs}-${crypto.randomUUID()}`;
  const minScore = nowMs - windowMs;

  await redis.zremrangebyscore(key, 0, minScore);
  await redis.zadd(key, nowMs, member);
  const count = await redis.zcard(key);
  await redis.pexpire(key, windowMs);

  return {
    allowed: Number(count) <= Number(maxRequests),
    count: Number(count),
    remaining: Math.max(0, Number(maxRequests) - Number(count)),
    retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
  };
}

function createHtmlQueuePage({ requestId, position, etaSeconds, routeGroup }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>High Traffic Queue | Divya Darshan</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: linear-gradient(180deg, #fbfcff 0%, #f4f6fd 100%); color: #1f2749; }
    .card { width: min(92vw, 540px); background: rgba(255,255,255,0.96); border-radius: 28px; padding: 32px; box-shadow: 0 12px 32px rgba(26,35,126,0.06); }
    .pill { display: inline-flex; padding: 10px 16px; border-radius: 999px; background: rgba(76,86,175,0.1); color: #4c56af; font-weight: 700; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    h1 { font-family: Manrope, Inter, sans-serif; font-size: 32px; margin: 16px 0 12px; }
    p { line-height: 1.6; color: #66708f; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }
    .stat { background: #eef1fb; border-radius: 22px; padding: 16px; text-align: center; }
    .stat strong { display: block; font-size: 22px; color: #1f2749; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="pill">Traffic Queue</span>
    <h1>High traffic detected</h1>
    <p>You are in the <strong>${routeGroup}</strong> queue. We’ll refresh this page automatically as soon as your request is ready to continue.</p>
    <div class="stats">
      <div class="stat">Position<strong id="queue-position">${position}</strong></div>
      <div class="stat">ETA<strong id="queue-eta">${etaSeconds}s</strong></div>
      <div class="stat">Status<strong id="queue-status">Queued</strong></div>
    </div>
  </div>
  <script>
    const requestId = ${JSON.stringify(requestId)};
    async function poll() {
      try {
        const res = await fetch('/api/queue/status/' + encodeURIComponent(requestId), { headers: { accept: 'application/json' } });
        const data = await res.json();
        document.getElementById('queue-position').textContent = data.position ?? 0;
        document.getElementById('queue-eta').textContent = (data.estimatedWaitSeconds ?? 0) + 's';
        document.getElementById('queue-status').textContent = data.status || 'Queued';
        if (data.status === 'ready' || data.status === 'processed') {
          window.location.reload();
          return;
        }
      } catch (error) {}
      window.setTimeout(poll, 2000);
    }
    poll();
  </script>
</body>
</html>`;
}

function createTrafficMiddleware({
  redis,
  logger = console,
  limits = DEFAULT_ROUTE_LIMITS,
}) {
  return async function trafficMiddleware(req, res, next) {
    if (!redis) return next();

    const routeGroup = deriveRouteGroupFromPath(req.path || req.originalUrl || '/');
    const limit = limits[routeGroup];

    try {
      await redis.hincrby('traffic:stats', `${routeGroup}:requests`, 1);
      await redis.hset('traffic:stats', 'lastRequestAt', new Date().toISOString());
    } catch (error) {
      logger.warn?.('[traffic] stats logging failed, allowing request:', error?.message || error);
      return next();
    }

    if (!limit) return next();

    try {
      const ip = getClientIp(req);
      const rateKey = `ratelimit:${ip}:${routeGroup}`;
      const result = await runSlidingWindowRateLimit({
        redis,
        key: rateKey,
        nowMs: Date.now(),
        maxRequests: limit.max,
        windowMs: limit.windowMs,
      });

      if (result.allowed) {
        res.setHeader('x-ratelimit-limit', String(limit.max));
        res.setHeader('x-ratelimit-remaining', String(result.remaining));
        return next();
      }

      const requestId = crypto.randomUUID();
      const queueKey = `queue:${routeGroup}`;
      const queueRequestKey = `queue:request:${requestId}`;
      const queueLength = await redis.rpush(queueKey, requestId);
      const position = Number(queueLength);
      const readyAt = new Date(Date.now() + position * 1000).toISOString();

      await redis.hset(queueRequestKey, {
        status: 'queued',
        requestId,
        routeGroup,
        method: req.method,
        path: req.originalUrl || req.path || '/',
        createdAt: new Date().toISOString(),
        readyAt,
        position: String(position),
        estimatedWaitSeconds: String(position),
      });
      await redis.expire(queueRequestKey, 600);

      if (isHtmlRequest(req)) {
        res.status(202).setHeader('content-type', 'text/html; charset=utf-8');
        return res.send(
          createHtmlQueuePage({
            requestId,
            position,
            etaSeconds: position,
            routeGroup,
          })
        );
      }

      return res.status(202).json({
        status: 'queued',
        routeGroup,
        position,
        estimatedWaitSeconds: position,
        requestId,
      });
    } catch (error) {
      logger.warn?.('[traffic] redis unavailable, failing open:', error?.message || error);
      return next();
    }
  };
}

function createQueueStatusHandler({ redis }) {
  return async function queueStatusHandler(req, res) {
    if (!redis) {
      return res.json({ status: 'ready', position: 0, estimatedWaitSeconds: 0, requestId: req.params.requestId });
    }

    const requestId = req.params.requestId;
    const queueRequestKey = `queue:request:${requestId}`;

    try {
      const details = await redis.hgetall(queueRequestKey);
      if (!details || !Object.keys(details).length) {
        return res.json({ status: 'ready', position: 0, estimatedWaitSeconds: 0, requestId });
      }

      if (details.status === 'ready' || details.status === 'processed') {
        return res.json({
          status: details.status,
          position: 0,
          estimatedWaitSeconds: 0,
          requestId,
          processedAt: details.processedAt || null,
        });
      }

      return res.json({
        status: details.status || 'queued',
        position: Number(details.position || 0),
        estimatedWaitSeconds: Number(details.estimatedWaitSeconds || 0),
        requestId,
        readyAt: details.readyAt || null,
      });
    } catch (error) {
      return res.status(500).json({ error: error?.message || 'Unable to read queue status.' });
    }
  };
}

function startTrafficQueueWorker({ redis, logger = console, pollIntervalMs = 1000 }) {
  if (!redis) return null;

  const timer = setInterval(async () => {
    for (const routeGroup of KNOWN_QUEUE_GROUPS) {
      const queueKey = `queue:${routeGroup}`;
      try {
        // Clear/process up to 50 queued requests in a single tick to ensure lightning-fast processing!
        for (let i = 0; i < 50; i++) {
          const requestId = await redis.lpop(queueKey);
          if (!requestId) break;
          const queueRequestKey = `queue:request:${requestId}`;
          await redis.hset(queueRequestKey, {
            status: 'ready',
            processedAt: new Date().toISOString(),
            position: '0',
            estimatedWaitSeconds: '0',
          });
          await redis.expire(queueRequestKey, 180);
        }

        const remainingIds = await redis.lrange(queueKey, 0, -1);
        for (let index = 0; index < remainingIds.length; index += 1) {
          const pendingId = remainingIds[index];
          await redis.hset(`queue:request:${pendingId}`, {
            position: String(index + 1),
            estimatedWaitSeconds: String(index + 1),
          });
        }
      } catch (error) {
        logger.warn?.('[traffic] queue worker failed:', error?.message || error);
      }
    }
  }, pollIntervalMs);

  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

module.exports = {
  DEFAULT_ROUTE_LIMITS,
  createHtmlQueuePage,
  createQueueStatusHandler,
  createTrafficMiddleware,
  deriveRouteGroupFromPath,
  getClientIp,
  isHtmlRequest,
  runSlidingWindowRateLimit,
  startTrafficQueueWorker,
};
