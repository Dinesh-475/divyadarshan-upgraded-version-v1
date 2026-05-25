const EventEmitter = require('events');

const BOOKING_CONTROL_CHANNEL = 'booking:control:broadcast';
const BOOKING_CONTROL_KEY = 'booking:globalPause';
const DEFAULT_BOOKING_CONTROL_STATE = {
  paused: false,
  reason: '',
  pausedAt: null,
  resumeAt: null,
  adminId: '',
};

function normalizeBookingControlState(input = {}) {
  return {
    paused: Boolean(input.paused),
    reason: String(input.reason || ''),
    pausedAt: input.paused ? String(input.pausedAt || new Date().toISOString()) : null,
    resumeAt: input.resumeAt ? String(input.resumeAt) : null,
    adminId: String(input.adminId || ''),
  };
}

function buildBookingPausedPayload(state) {
  return {
    error: 'BookingPaused',
    reason: state.reason || 'Ticket booking is temporarily paused.',
    resumeAt: state.resumeAt || null,
  };
}

function isBookingPaused(state) {
  return Boolean(state?.paused);
}

function createBookingControlService({
  redis = null,
  redisSubscriber = null,
  supabase = null,
  bookingPauseSecret = '',
  logger = console,
}) {
  const emitter = new EventEmitter();
  const sseClients = new Set();
  let memoryState = { ...DEFAULT_BOOKING_CONTROL_STATE };
  const isLocalDev = process.env.NODE_ENV !== 'production';
  const localDevSecret = '123456789';

  async function readStateFromDb() {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', BOOKING_CONTROL_KEY)
        .maybeSingle();
      if (error) throw error;
      return data?.value ? normalizeBookingControlState(data.value) : null;
    } catch (error) {
      logger.warn?.('[booking-control] unable to read DB state:', error?.message || error);
      return null;
    }
  }

  async function writeStateToDb(nextState) {
    if (!supabase) return;
    try {
      await supabase.from('system_settings').upsert(
        {
          key: BOOKING_CONTROL_KEY,
          value: nextState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    } catch (error) {
      logger.warn?.('[booking-control] unable to persist DB state:', error?.message || error);
    }
  }

  async function appendAuditLog(nextState, action) {
    if (!supabase) return;
    try {
      await supabase.from('booking_control_audit').insert({
        admin_id: nextState.adminId || 'system',
        action,
        reason: nextState.reason || null,
        resume_at: nextState.resumeAt || null,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn?.('[booking-control] unable to append audit log:', error?.message || error);
    }
  }

  async function readStateFromRedis() {
    if (!redis) return null;
    try {
      const payload = await redis.get(BOOKING_CONTROL_KEY);
      return payload ? normalizeBookingControlState(JSON.parse(payload)) : null;
    } catch (error) {
      logger.warn?.('[booking-control] unable to read redis state:', error?.message || error);
      return null;
    }
  }

  async function writeStateToRedis(nextState) {
    if (!redis) return;
    try {
      await redis.set(BOOKING_CONTROL_KEY, JSON.stringify(nextState));
    } catch (error) {
      logger.warn?.('[booking-control] unable to write redis state:', error?.message || error);
    }
  }

  function broadcastState(nextState) {
    const payload = JSON.stringify({ type: 'booking-control', state: nextState });
    emitter.emit('change', nextState);
    for (const res of sseClients) {
      try {
        res.write(`event: booking-control\n`);
        res.write(`data: ${payload}\n\n`);
      } catch (error) {
        sseClients.delete(res);
      }
    }
  }

  async function publishState(nextState) {
    broadcastState(nextState);
    if (!redis) return;
    try {
      await redis.publish(BOOKING_CONTROL_CHANNEL, JSON.stringify(nextState));
    } catch (error) {
      logger.warn?.('[booking-control] unable to publish redis state:', error?.message || error);
    }
  }

  async function hydrate() {
    const redisState = await readStateFromRedis();
    const dbState = await readStateFromDb();
    const nextState = redisState || dbState || { ...DEFAULT_BOOKING_CONTROL_STATE };
    memoryState = normalizeBookingControlState(nextState);
    if (!redisState && dbState) await writeStateToRedis(memoryState);
    return memoryState;
  }

  async function maybeAutoResume(currentState) {
    const state = currentState || memoryState;
    if (!state.paused || !state.resumeAt) return state;
    if (new Date(state.resumeAt).getTime() > Date.now()) return state;
    return await setState(
      {
        paused: false,
        reason: '',
        resumeAt: null,
        adminId: state.adminId || 'system',
      },
      { action: 'resumed' }
    );
  }

  async function getState() {
    if (redis) {
      const redisState = await readStateFromRedis();
      if (redisState) memoryState = redisState;
    }
    return await maybeAutoResume(memoryState);
  }

  async function setState(input, { action } = {}) {
    const normalized = normalizeBookingControlState(input);
    memoryState = normalized;
    await writeStateToRedis(normalized);
    await writeStateToDb(normalized);
    await appendAuditLog(normalized, action || (normalized.paused ? 'paused' : 'resumed'));
    await publishState(normalized);
    return normalized;
  }

  async function getAuditLog() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('booking_control_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.warn?.('[booking-control] unable to load audit log:', error?.message || error);
      return [];
    }
  }

  function adminAuth(req, res, next) {
    const providedSecret =
      req.headers['x-booking-pause-secret'] ||
      req.headers['x-admin-secret'] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
      req.body?.secret ||
      '';

    const matchesConfiguredSecret = bookingPauseSecret && String(providedSecret) === String(bookingPauseSecret);
    const matchesLocalFallback = isLocalDev && String(providedSecret) === localDevSecret;

    if (!matchesConfiguredSecret && !matchesLocalFallback) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.bookingControlAdminId =
      req.headers['x-admin-id'] || req.body?.adminId || req.body?.identity || 'global-admin';
    next();
  }

  function attachSse(req, res) {
    res.setHeader('content-type', 'text/event-stream');
    res.setHeader('cache-control', 'no-cache');
    res.setHeader('connection', 'keep-alive');
    res.flushHeaders?.();
    sseClients.add(res);
    getState()
      .then((state) => {
        res.write(`event: booking-control\n`);
        res.write(`data: ${JSON.stringify({ type: 'booking-control', state })}\n\n`);
      })
      .catch(() => {});
    req.on('close', () => {
      sseClients.delete(res);
      res.end();
    });
  }

  if (redisSubscriber) {
    try {
      redisSubscriber.subscribe(BOOKING_CONTROL_CHANNEL);
      redisSubscriber.on('message', (channel, message) => {
        if (channel !== BOOKING_CONTROL_CHANNEL) return;
        try {
          const state = normalizeBookingControlState(JSON.parse(message));
          memoryState = state;
          broadcastState(state);
        } catch (error) {
          logger.warn?.('[booking-control] invalid pubsub message:', error?.message || error);
        }
      });
    } catch (error) {
      logger.warn?.('[booking-control] unable to subscribe to pubsub:', error?.message || error);
    }
  }

  return {
    BOOKING_CONTROL_CHANNEL,
    BOOKING_CONTROL_KEY,
    adminAuth,
    attachSse,
    buildBookingPausedPayload,
    emitter,
    getAuditLog,
    getState,
    hydrate,
    isBookingPaused,
    maybeAutoResume,
    setState,
  };
}

module.exports = {
  BOOKING_CONTROL_CHANNEL,
  BOOKING_CONTROL_KEY,
  DEFAULT_BOOKING_CONTROL_STATE,
  buildBookingPausedPayload,
  createBookingControlService,
  isBookingPaused,
  normalizeBookingControlState,
};
