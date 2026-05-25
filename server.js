const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const EventEmitter = require('events');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cheerio = require('cheerio');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const {
  buildBookingPausedPayload,
  createBookingControlService,
} = require('./lib/bookingControl');
const {
  createQueueStatusHandler,
  createTrafficMiddleware,
  startTrafficQueueWorker,
} = require('./lib/trafficMiddleware');
const { buildTempleThemeCssVars } = require('./lib/themeUtils');

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_FROM || ''; // whatsapp:+14155238886 (sandbox) or +1...
const TWILIO_CHANNEL = (process.env.TWILIO_CHANNEL || '').toLowerCase(); // 'whatsapp' or 'sms'
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@divyadarshan.org';
const JWT_SECRET = process.env.JWT_SECRET || 'divyadarshan-local-demo-secret';
const REDIS_URL = process.env.REDIS_URL || '';
const BOOKING_PAUSE_SECRET = process.env.BOOKING_PAUSE_SECRET || '';
const IMAGE_UPLOAD_PROVIDER = (process.env.IMAGE_UPLOAD_PROVIDER || '').toLowerCase();
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || '';
const LOCAL_TEMPLE_STORE_PATH = path.join(__dirname, 'data', 'registered_temples.local.json');
const LOCAL_TEMPLE_ACTIVITY_PATH = path.join(__dirname, 'data', 'temple_activity.local.json');
const DEMO_TEMPLE_DIR = path.join(__dirname, 'data', 'demo-temples');

function createOptionalRedisClient(connectionString) {
  if (!connectionString) return null;
  try {
    // Lazy require so the server still boots if ioredis is not installed yet.
    // The traffic and booking-control layers fail open when Redis is unavailable.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Redis = require('ioredis');
    const client = new Redis(connectionString, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableAutoPipelining: true,
    });
    client.on('error', (error) => {
      console.warn('[divyadarshan] Redis connection warning:', error?.message || error);
    });
    client.connect().catch((error) => {
      console.warn('[divyadarshan] Redis connect failed, continuing in fail-open mode:', error?.message || error);
    });
    return client;
  } catch (error) {
    console.warn('[divyadarshan] ioredis is not installed. Traffic queueing will fail open until dependencies are installed.');
    return null;
  }
}

const redis = createOptionalRedisClient(REDIS_URL);
const redisSubscriber = REDIS_URL ? createOptionalRedisClient(REDIS_URL) : null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Server can still run to serve static UI, but APIs will error clearly.
  console.warn('[divyadarshan] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;
let supabaseCircuitOpenUntil = 0;

function shouldUseSupabase() {
  return Boolean(supabase) && Date.now() >= supabaseCircuitOpenUntil;
}

function markSupabaseUnavailable(error, context = 'Supabase request') {
  supabaseCircuitOpenUntil = Date.now() + 60 * 1000;
  console.warn(`[divyadarshan] ${context} fell back to local store:`, error?.message || error);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Subdomain host-rewriter middleware
app.use((req, res, next) => {
  const host = req.get('host') || '';
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');

  let subdomain = null;
  if (parts.length > 1) {
    if (hostname.endsWith('.divyadarshan.in')) {
      const prefix = hostname.substring(0, hostname.length - '.divyadarshan.in'.length);
      if (prefix && prefix !== 'www' && prefix !== 'admin' && prefix !== 'api') {
        subdomain = prefix;
      }
    } else if (hostname.endsWith('.localhost')) {
      const prefix = hostname.substring(0, hostname.length - '.localhost'.length);
      if (prefix && prefix !== 'www' && prefix !== 'admin' && prefix !== 'api') {
        subdomain = prefix;
      }
    }
  }

  if (subdomain) {
    if (!req.url.startsWith('/api/') && !req.url.startsWith('/assets/') && !req.url.includes('.')) {
      if (req.url === '/') {
        req.url = `/temple/${subdomain}`;
      } else if (req.url === '/admin') {
        req.url = `/temple/${subdomain}/admin`;
      } else if (req.url === '/admin/login') {
        req.url = `/temple/${subdomain}/admin/login`;
      } else {
        req.url = `/temple/${subdomain}${req.url}`;
      }
      console.log(`[Subdomain Rewrite] ${host}${req.originalUrl} -> ${req.url}`);
    }
  }
  next();
});

const BUILD_ID = new Date().toISOString();
const bookingEvents = new EventEmitter();
const bookingEventClients = new Set();
const ticketEventClients = new Set();
const VALID_TICKET_STATUSES = new Set(['OPEN', 'CLOSED', 'BLOCKED', 'SOLD_OUT']);
const DEFAULT_TICKET_STATUS = 'OPEN';

const bookingControl = createBookingControlService({
  redis,
  redisSubscriber,
  supabase,
  bookingPauseSecret: BOOKING_PAUSE_SECRET,
  logger: console,
});

app.use(createTrafficMiddleware({ redis, logger: console }));
app.get('/api/queue/status/:requestId', createQueueStatusHandler({ redis }));
startTrafficQueueWorker({ redis, logger: console, pollIntervalMs: 200 });
bookingControl.hydrate().catch((error) => {
  console.warn('[divyadarshan] Booking control hydrate failed:', error?.message || error);
});

// Serve the existing static project (so one command runs everything)
app.use(express.static(path.join(__dirname)));

function requireSupabase(req, res) {
  if (!supabase) {
    res.status(500).json({
      error:
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a .env file.',
    });
    return false;
  }
  return true;
}

async function readLocalTempleStore() {
  try {
    const raw = await fs.readFile(LOCAL_TEMPLE_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      registered_temples: Array.isArray(parsed.registered_temples) ? parsed.registered_temples : [],
      temple_profiles: Array.isArray(parsed.temple_profiles) ? parsed.temple_profiles : [],
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { registered_temples: [], temple_profiles: [] };
    }
    throw error;
  }
}

async function writeLocalTempleStore(nextStore) {
  await fs.mkdir(path.dirname(LOCAL_TEMPLE_STORE_PATH), { recursive: true });
  await fs.writeFile(
    LOCAL_TEMPLE_STORE_PATH,
    JSON.stringify(
      {
        registered_temples: Array.isArray(nextStore?.registered_temples) ? nextStore.registered_temples : [],
        temple_profiles: Array.isArray(nextStore?.temple_profiles) ? nextStore.temple_profiles : [],
      },
      null,
      2
    ),
    'utf8'
  );
}

async function readLocalTempleActivityStore() {
  try {
    const raw = await fs.readFile(LOCAL_TEMPLE_ACTIVITY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      donations: Array.isArray(parsed.donations) ? parsed.donations : [],
      prasadam_orders: Array.isArray(parsed.prasadam_orders) ? parsed.prasadam_orders : [],
      qr_scans: Array.isArray(parsed.qr_scans) ? parsed.qr_scans : [],
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { bookings: [], donations: [], prasadam_orders: [], qr_scans: [] };
    }
    throw error;
  }
}

async function writeLocalTempleActivityStore(nextStore) {
  await fs.mkdir(path.dirname(LOCAL_TEMPLE_ACTIVITY_PATH), { recursive: true });
  await fs.writeFile(
    LOCAL_TEMPLE_ACTIVITY_PATH,
    JSON.stringify(
      {
        bookings: Array.isArray(nextStore?.bookings) ? nextStore.bookings : [],
        donations: Array.isArray(nextStore?.donations) ? nextStore.donations : [],
        prasadam_orders: Array.isArray(nextStore?.prasadam_orders) ? nextStore.prasadam_orders : [],
        qr_scans: Array.isArray(nextStore?.qr_scans) ? nextStore.qr_scans : [],
      },
      null,
      2
    ),
    'utf8'
  );
}

async function appendLocalTempleActivity(kind, row) {
  const store = await readLocalTempleActivityStore();
  const key = kind === 'orders' ? 'prasadam_orders' : kind;
  const next = {
    ...store,
    [key]: [...(store[key] || []), row],
  };
  await writeLocalTempleActivityStore(next);
  return row;
}

async function listLocalTempleActivity(slug, kind) {
  const store = await readLocalTempleActivityStore();
  const key = kind === 'orders' ? 'prasadam_orders' : kind;
  return (store[key] || [])
    .filter((item) => item.temple_slug === slug || item.temple_key === slug)
    .sort((a, b) => String(b.created_at || b.scanned_at || '').localeCompare(String(a.created_at || a.scanned_at || '')));
}

async function upsertLocalTempleProfile(profile) {
  if (!profile?.slug) return null;
  const now = new Date().toISOString();
  const store = await readLocalTempleStore();
  const registry = {
    slug: profile.slug,
    status: profile.status || 'active',
    created_at: profile.created_at || now,
    updated_at: now,
  };
  const nextRegistered = (store.registered_temples || []).filter((item) => item.slug !== profile.slug);
  const nextProfiles = (store.temple_profiles || []).filter((item) => item.slug !== profile.slug);
  const cleanProfile = { ...profile, updated_at: now };
  delete cleanProfile.source;
  delete cleanProfile.theme_vars;
  nextRegistered.push(registry);
  nextProfiles.push(cleanProfile);
  await writeLocalTempleStore({ registered_temples: nextRegistered, temple_profiles: nextProfiles });
  return { ...cleanProfile, status: registry.status, created_at: registry.created_at, updated_at: now };
}

async function updateLocalTempleProfile(slug, updater) {
  const existing = await fetchLocalTempleProfile(slug);
  if (!existing) return null;
  const patch = typeof updater === 'function' ? updater(existing) : updater;
  return upsertLocalTempleProfile({ ...existing, ...(patch || {}), slug });
}

function buildTempleAdminSummary(profile, bookings = [], donations = [], scans = []) {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const monthKey = todayIso.slice(0, 7);
  const since = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const scanChartMap = new Map();

  for (let i = 0; i < 30; i += 1) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    scanChartMap.set(d, 0);
  }
  for (const scan of scans || []) {
    const key = String(scan.scanned_at || scan.created_at || '').slice(0, 10);
    if (scanChartMap.has(key)) scanChartMap.set(key, Number(scanChartMap.get(key) || 0) + 1);
  }

  return {
    slug: profile.slug,
    temple_name: profile.temple_name,
    bookings_today: bookings.filter((item) => String(item.visit_date || item.created_at || '').slice(0, 10) === todayIso).length,
    bookings_month: bookings.filter((item) => String(item.created_at || '').slice(0, 7) === monthKey).length,
    bookings_total: bookings.length || Number(profile.total_bookings || 0),
    donations_total: donations.length
      ? donations.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      : Number(profile.total_donations || 0),
    qr_scans_total: scans.length || Number(profile.total_scans || 0),
    active_sevas: Array.isArray(profile.sevas) ? profile.sevas.length : 0,
    total_bookings_counter: Number(profile.total_bookings || 0),
    total_donations_counter: Number(profile.total_donations || 0),
    scan_chart: Array.from(scanChartMap, ([date, count]) => ({ date, count })),
  };
}

async function readDemoTempleProfiles() {
  try {
    const entries = await fs.readdir(DEMO_TEMPLE_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));
    const profiles = await Promise.all(
      files.map(async (entry) => {
        const raw = await fs.readFile(path.join(DEMO_TEMPLE_DIR, entry.name), 'utf8');
        return JSON.parse(raw);
      })
    );
    return profiles
      .filter((item) => item && item.slug)
      .map((item) => ({
        ...item,
        source: 'demo-file',
      }));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function fetchDemoTempleProfile(slug) {
  const profiles = await readDemoTempleProfiles();
  return profiles.find((item) => item.slug === slug) || null;
}

async function upsertLocalTempleRegistration({ registry, profile }) {
  const store = await readLocalTempleStore();
  const nextRegistered = (store.registered_temples || []).filter((item) => item.slug !== registry.slug);
  const nextProfiles = (store.temple_profiles || []).filter((item) => item.slug !== profile.slug);
  nextRegistered.push(registry);
  nextProfiles.push(profile);
  await writeLocalTempleStore({ registered_temples: nextRegistered, temple_profiles: nextProfiles });
}

async function updateLocalTempleRegistrationStatus(slug, status) {
  const store = await readLocalTempleStore();
  const nextRegistered = (store.registered_temples || []).map((item) =>
    item.slug === slug ? { ...item, status, updated_at: new Date().toISOString() } : item
  );
  await writeLocalTempleStore({
    registered_temples: nextRegistered,
    temple_profiles: store.temple_profiles || [],
  });
  return nextRegistered.find((item) => item.slug === slug) || null;
}

async function deleteLocalTempleRegistration(slug) {
  const store = await readLocalTempleStore();
  const wasPresent = (store.registered_temples || []).some((item) => item.slug === slug);
  const nextRegistered = (store.registered_temples || []).filter((item) => item.slug !== slug);
  const nextProfiles = (store.temple_profiles || []).filter((item) => item.slug !== slug);
  await writeLocalTempleStore({ registered_temples: nextRegistered, temple_profiles: nextProfiles });
  return wasPresent;
}

async function fetchLocalTempleProfile(slug) {
  const store = await readLocalTempleStore();
  const profile = (store.temple_profiles || []).find((item) => item.slug === slug);
  if (!profile) return fetchDemoTempleProfile(slug);
  const registry = (store.registered_temples || []).find((item) => item.slug === slug);
  return {
    ...profile,
    status: registry?.status || 'active',
    created_at: registry?.created_at || profile.created_at || null,
    updated_at: registry?.updated_at || profile.updated_at || null,
    source: 'local-store',
  };
}

async function listLocalTempleProfiles(status = '') {
  const store = await readLocalTempleStore();
  const registryRows = status
    ? (store.registered_temples || []).filter((item) => String(item.status || '').toLowerCase() === status)
    : (store.registered_temples || []);
  const profileMap = new Map((store.temple_profiles || []).map((item) => [item.slug, item]));
  const items = registryRows
    .map((row) => {
      const profile = profileMap.get(row.slug);
      if (!profile) return null;
      return {
        ...profile,
        status: row.status || 'active',
        created_at: row.created_at || profile.created_at || null,
        updated_at: row.updated_at || profile.updated_at || null,
        source: 'local-store',
      };
    })
    .filter(Boolean);
  const demos = await readDemoTempleProfiles();
  const filteredDemos = status ? demos.filter((item) => String(item.status || '').toLowerCase() === status) : demos;
  const existing = new Set(items.map((item) => item.slug));
  return [
    ...items,
    ...filteredDemos.filter((item) => !existing.has(item.slug)),
  ];
}

function broadcastBookingEvent(type, booking) {
  const payload = JSON.stringify({
    type,
    booking: booking || null,
    timestamp: new Date().toISOString(),
  });
  bookingEvents.emit('change', { type, booking });
  for (const res of bookingEventClients) {
    try {
      res.write(`event: booking-update\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (error) {
      bookingEventClients.delete(res);
    }
  }
}

function broadcastTicketEvent(type, ticket) {
  const payload = JSON.stringify({
    type,
    ticket: ticket || null,
    timestamp: new Date().toISOString(),
  });
  for (const res of ticketEventClients) {
    try {
      res.write(`event: ticket-update\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (error) {
      ticketEventClients.delete(res);
    }
  }
}

function normalizeTicketStatus(status, fallback = DEFAULT_TICKET_STATUS) {
  const normalized = String(status || fallback).trim().toUpperCase();
  return VALID_TICKET_STATUSES.has(normalized) ? normalized : fallback;
}

function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function sanitizeTicketRecord(record) {
  if (!record) return record;
  return {
    ...record,
    price: Number(record.price || 0),
    total_seats: toInteger(record.total_seats, 0),
    available_seats: toInteger(record.available_seats, 0),
    booked_seats: toInteger(record.booked_seats, 0),
    booking_limit: Math.max(1, toInteger(record.booking_limit, 1)),
    booking_enabled: record.booking_enabled !== false,
    status: normalizeTicketStatus(record.status),
  };
}

function computeAvailableSeats(totalSeats, bookedSeats) {
  return Math.max(0, Math.max(0, toInteger(totalSeats, 0)) - Math.max(0, toInteger(bookedSeats, 0)));
}

function normalizeTwilioTo(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  // If user provided +..., keep it; else assume E.164-ish by prefixing +.
  const e164 = raw.startsWith('+') ? raw : `+${digits}`;
  if (TWILIO_CHANNEL === 'whatsapp') return `whatsapp:${e164}`;
  return e164;
}

async function twilioSendMessage({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    throw new Error('Twilio not configured (missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM)');
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`;
  const params = new URLSearchParams();
  params.set('To', to);
  params.set('From', TWILIO_FROM);
  params.set('Body', body);

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const text = await resp.text().catch(() => '');
  if (!resp.ok) throw new Error(`Twilio send failed (${resp.status}): ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildBookingConfirmationText(b) {
  const lines = [];
  lines.push('✅ Divya Darshan — Ticket Confirmed');
  lines.push(`Ticket ID: ${b.id}`);
  lines.push(`Temple: ${b.temple_name}`);
  if (b.visit_date) lines.push(`Date: ${b.visit_date}`);
  if (b.slot) lines.push(`Slot: ${b.slot}`);
  lines.push(`People: ${b.qty}`);
  if (b.ticket_type) lines.push(`Type: ${b.ticket_type}`);
  lines.push('');
  lines.push('Show this Ticket ID at the gate.');
  return lines.join('\n');
}

const TEMPLE_PROFILE_JSON_FIELDS = new Set([
  'gallery_urls',
  'darshan_timings',
  'special_days',
  'closed_days',
  'sevas',
  'prasadam_items',
  'facilities',
  'features_enabled',
  'donation_causes',
  'events',
  'faqs',
  'custom_pages',
  'service_languages',
  'major_annual_festivals',
  'weekly_special_prayers',
  'special_puja_bookings',
  'parking_layout',
  'parking_details',
  'admin_id_verification',
]);

const TEMPLE_PROFILE_BOOLEAN_FIELDS = new Set([
  'id_required',
  'photography_allowed',
  'mobile_allowed',
  'prasadam_counter_open',
  'prasadam_online_order',
  'donation_enabled',
  'entry_fee_enabled',
  'booking_enabled',
  'is_preview',
]);

const TEMPLE_PROFILE_INTEGER_FIELDS = new Set([
  'established_year',
  'parking_capacity',
  'total_scans',
  'total_bookings',
  'slot_duration',
  'max_visitors_per_slot',
  'advance_booking_window',
]);

const TEMPLE_PROFILE_NUMERIC_FIELDS = new Set([
  'latitude',
  'longitude',
  'entry_fee_general',
  'entry_fee_vip',
  'entry_fee_child',
  'parking_fee_2w',
  'parking_fee_4w',
  'total_donations',
]);

const TEMPLE_PROFILE_ALLOWED_FIELDS = [
  'temple_name',
  'religion',
  'religion_other',
  'deity_name',
  'sect_denomination',
  'temple_type',
  'established_year',
  'trust_name',
  'tagline',
  'historical_significance',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'pincode',
  'country',
  'latitude',
  'longitude',
  'google_maps_url',
  'nearest_railway',
  'nearest_airport',
  'nearest_bus_stop',
  'admin_email',
  'admin_phone',
  'website_url',
  'social_facebook',
  'social_instagram',
  'social_youtube',
  'theme_preset',
  'background_style',
  'primary_color',
  'secondary_color',
  'accent_color',
  'logo_url',
  'hero_image_url',
  'gallery_urls',
  'darshan_timings',
  'special_days',
  'closed_days',
  'service_languages',
  'dress_code_mode',
  'entry_fee_enabled',
  'entry_fee_currency',
  'entry_fee_general',
  'entry_fee_vip',
  'entry_fee_child',
  'dress_code',
  'special_entry_rules',
  'id_required',
  'photography_allowed',
  'mobile_allowed',
  'sevas',
  'major_annual_festivals',
  'weekly_special_prayers',
  'special_events_text',
  'prasadam_items',
  'prasadam_counter_open',
  'prasadam_online_order',
  'facilities',
  'parking_capacity',
  'parking_fee_2w',
  'parking_fee_4w',
  'accommodation_details',
  'annadanam_timings',
  'features_enabled',
  'booking_enabled',
  'slot_duration',
  'max_visitors_per_slot',
  'advance_booking_window',
  'special_puja_bookings',
  'live_stream_url',
  'virtual_tour_url',
  'donation_enabled',
  'donation_upi_id',
  'donation_bank_name',
  'donation_account_no',
  'donation_ifsc',
  'donation_causes',
  'events',
  'faqs',
  'custom_pages',
  'qr_code_url',
  'total_scans',
  'total_bookings',
  'total_donations',
  'is_preview',
  'parking_layout',
  'parking_details',
  'admin_id_verification',
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function deriveTempleRegistrationSlug(input = {}) {
  const explicitSlug = slugify(input.slug);
  if (explicitSlug) return explicitSlug;
  const name = String(input.temple_name || '').trim();
  const city = String(input.city || '').trim();
  return slugify([name, city].filter(Boolean).join(' '));
}

function toJsonValue(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return Boolean(value);
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIntegerOrNull(value) {
  const parsed = toNumberOrNull(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function cloneDefaultForField(field) {
  return TEMPLE_PROFILE_JSON_FIELDS.has(field)
    ? [
        'gallery_urls',
        'darshan_timings',
        'special_days',
        'closed_days',
        'sevas',
        'prasadam_items',
        'donation_causes',
        'events',
        'faqs',
        'custom_pages',
        'service_languages',
        'major_annual_festivals',
        'weekly_special_prayers',
        'special_puja_bookings',
      ].includes(field)
      ? []
      : {}
    : null;
}

function coerceTempleProfileField(field, value) {
  if (TEMPLE_PROFILE_JSON_FIELDS.has(field)) {
    const parsed = toJsonValue(value, cloneDefaultForField(field));
    if (Array.isArray(cloneDefaultForField(field))) return Array.isArray(parsed) ? parsed : [];
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  }
  if (TEMPLE_PROFILE_BOOLEAN_FIELDS.has(field)) return toBoolean(value);
  if (TEMPLE_PROFILE_INTEGER_FIELDS.has(field)) return toIntegerOrNull(value);
  if (TEMPLE_PROFILE_NUMERIC_FIELDS.has(field)) return toNumberOrNull(value);
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return String(value);
}

function sanitizeTempleProfilePayload(input = {}) {
  const payload = {};
  for (const field of TEMPLE_PROFILE_ALLOWED_FIELDS) {
    if (input[field] === undefined) continue;
    const coerced = coerceTempleProfileField(field, input[field]);
    if (coerced !== undefined) payload[field] = coerced;
  }
  return payload;
}

function buildTempleMicrositeUrl(req, slug, viaQr = false) {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  
  let newHost = host;
  if (host.includes('divyadarshan.in')) {
    const parts = host.split('.');
    const baseIdx = parts.findIndex(p => p === 'divyadarshan');
    const baseDomain = parts.slice(baseIdx).join('.');
    newHost = `${slug}.${baseDomain}`;
  } else if (host.includes('localhost')) {
    const parts = host.split('.');
    const localhostPort = parts[parts.length - 1]; // e.g. localhost:3000
    newHost = `${slug}.${localhostPort}`;
  } else {
    // Fallback if accessed via IP or other host
    const base = `${protocol}://${host}/temple/${encodeURIComponent(slug)}`;
    return viaQr ? `${base}?via=qr` : base;
  }
  
  const base = `${protocol}://${newHost}`;
  return viaQr ? `${base}?via=qr` : base;
}


function buildQrCodeUrl(targetUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=${encodeURIComponent(targetUrl)}`;
}

function getTempleDateLabel(dateValue) {
  const parsed = dateValue ? new Date(dateValue) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

function buildTempleSlotsForDate(profile, dateValue) {
  const dayName = getTempleDateLabel(dateValue);
  const timing = Array.isArray(profile?.darshan_timings)
    ? profile.darshan_timings.find((item) => item?.day === dayName && !item?.closed)
    : null;
  const sessions = Array.isArray(timing?.sessions) && timing.sessions.length
    ? timing.sessions
    : timing?.open && timing?.close
      ? [{ label: 'Darshan', start: timing.open, end: timing.close }]
      : [];

  const slotDuration = Number(profile?.slot_duration || 30);
  const maxVisitors = Number(profile?.max_visitors_per_slot || 0);
  return sessions.map((session) => ({
    label: session.label || 'Darshan',
    start: session.start || '',
    end: session.end || '',
    slotDuration,
    maxVisitors,
    available: true,
  }));
}

async function buildTempleSlotsWithAvailability(profile, dateValue) {
  const baseSlots = buildTempleSlotsForDate(profile, dateValue);
  if (!baseSlots.length) return baseSlots;

  const slotKeys = baseSlots.map((slot) => `${slot.label} (${slot.start}-${slot.end})`);
  let data = [];
  if (shouldUseSupabase()) {
    try {
      const response = await supabase
        .from('bookings')
        .select('slot, qty, status')
        .eq('temple_slug', profile.slug)
        .eq('visit_date', dateValue);
      if (response.error) throw response.error;
      data = response.data || [];
    } catch (error) {
      markSupabaseUnavailable(error, 'slot availability');
      data = await listLocalTempleActivity(profile.slug, 'bookings');
    }
  } else {
    data = await listLocalTempleActivity(profile.slug, 'bookings');
  }

  const bookedBySlot = new Map();
  for (const row of data || []) {
    if (dateValue && String(row.visit_date || '') !== String(dateValue)) continue;
    if (String(row.status || '').toLowerCase() === 'cancelled') continue;
    const key = String(row.slot || '');
    bookedBySlot.set(key, Number(bookedBySlot.get(key) || 0) + Number(row.qty || 0));
  }

  return baseSlots.map((slot, index) => {
    const key = slotKeys[index];
    const total = Math.max(1, Number(slot.maxVisitors || profile?.max_visitors_per_slot || 50));
    const booked = Number(bookedBySlot.get(key) || 0);
    const available = Math.max(0, total - booked);
    return {
      ...slot,
      key,
      total,
      booked,
      available,
      availableLabel: available <= 0 ? 'Full' : `${available} left`,
      nearlyFull: available > 0 && available / total <= 0.2,
      isFull: available <= 0,
    };
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  const extMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return {
    mimeType,
    extension: extMap[mimeType] || 'bin',
    buffer: Buffer.from(base64, 'base64'),
  };
}

function isSupportedTempleImageValue(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

async function uploadTempleAssetIfNeeded(slug, value, folder, index = 0) {
  if (!isSupportedTempleImageValue(value)) return value;
  if (!supabase || IMAGE_UPLOAD_PROVIDER !== 'supabase_storage' || !SUPABASE_STORAGE_BUCKET) return value;

  const parsed = parseDataUrl(value);
  if (!parsed) return value;

  const objectPath = `temples/${slug}/${folder}/${Date.now()}-${index}.${parsed.extension}`;
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(objectPath, parsed.buffer, {
    contentType: parsed.mimeType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
  return data?.publicUrl || value;
}

async function hydrateTempleAssetFields(slug, profilePayload) {
  const next = { ...profilePayload };

  if (next.logo_url) {
    next.logo_url = await uploadTempleAssetIfNeeded(slug, next.logo_url, 'logo');
  }
  if (next.hero_image_url) {
    next.hero_image_url = await uploadTempleAssetIfNeeded(slug, next.hero_image_url, 'hero');
  }
  if (Array.isArray(next.gallery_urls) && next.gallery_urls.length) {
    next.gallery_urls = await Promise.all(
      next.gallery_urls.map((item, index) => uploadTempleAssetIfNeeded(slug, item, 'gallery', index))
    );
  }

  return next;
}

function getTempleBookingPrice(profile, ticketType) {
  const normalized = String(ticketType || 'general').trim().toLowerCase();
  if (normalized === 'vip') return Number(profile?.entry_fee_vip || 0);
  if (normalized === 'child') return Number(profile?.entry_fee_child || 0);
  return Number(profile?.entry_fee_general || 0);
}

function buildTempleTicketId(slug) {
  return `${slug.toUpperCase().slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`;
}

function buildTempleBookingConfirmationText(booking, profile) {
  const lines = [];
  lines.push('🙏 Divya Darshan Temple Booking Confirmed');
  lines.push(`Ticket ID: ${booking.id}`);
  lines.push(`Temple: ${profile?.temple_name || booking.temple_name || booking.temple_slug}`);
  if (booking.visit_date) lines.push(`Date: ${booking.visit_date}`);
  if (booking.slot) lines.push(`Slot: ${booking.slot}`);
  if (booking.ticket_type) lines.push(`Ticket: ${booking.ticket_type}`);
  lines.push(`Pilgrims: ${booking.qty}`);
  if (booking.total_amount !== undefined) lines.push(`Amount: INR ${Number(booking.total_amount || 0).toFixed(2)}`);
  lines.push('Please keep your ticket ID ready for darshan entry.');
  return lines.join('\n');
}

function buildTempleSlotKey(slot = {}) {
  return `${slot.label || 'Darshan'} (${slot.start || ''}-${slot.end || ''})`;
}

function requireTempleJwt(res) {
  if (!JWT_SECRET) {
    res.status(500).json({ error: 'JWT_SECRET is not configured in the server environment.' });
    return false;
  }
  return true;
}

function templeAuth(req, res, next) {
  if (!requireTempleJwt(res)) return;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const claims = jwt.verify(token, JWT_SECRET);
    if (claims?.role !== 'temple_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.params.slug && claims.sub !== req.params.slug) {
      return res.status(403).json({ error: 'Token is not valid for this temple.' });
    }
    req.templeAdmin = claims;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

async function trackTempleQrScan(req, slug) {
  if (!supabase) return null;
  const payload = {
    temple_slug: slug,
    user_agent: req.get('user-agent') || null,
    ip_hash: crypto.createHash('sha256').update(getClientIp(req)).digest('hex'),
  };

  await supabase.from('qr_scans').insert(payload);

  const { data: current } = await supabase
    .from('temple_profiles')
    .select('total_scans')
    .eq('slug', slug)
    .maybeSingle();

  const nextTotal = Number(current?.total_scans || 0) + 1;
  const { error } = await supabase
    .from('temple_profiles')
    .update({ total_scans: nextTotal })
    .eq('slug', slug);

  if (error) throw error;
  return nextTotal;
}

async function touchTempleUpdatedAt(slug) {
  if (!supabase) return;
  await supabase
    .from('registered_temples')
    .update({ updated_at: new Date().toISOString() })
    .eq('slug', slug);
}

async function fetchTempleProfile(slug) {
  if (shouldUseSupabase()) {
    try {
      const { data: profile, error } = await supabase
        .from('temple_profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (profile) {
        const { data: registry, error: registryError } = await supabase
          .from('registered_temples')
          .select('slug, status, created_at, updated_at')
          .eq('slug', slug)
          .maybeSingle();

        if (registryError) throw registryError;
        return {
          ...profile,
          status: registry?.status || 'active',
          created_at: registry?.created_at || null,
          updated_at: registry?.updated_at || null,
          source: 'supabase',
        };
      }
    } catch (error) {
      markSupabaseUnavailable(error, 'temple profile fetch');
    }
  }

  return fetchLocalTempleProfile(slug);
}

async function fetchTemplePublicProfile(slug) {
  const profile = await fetchTempleProfile(slug);
  if (!profile) return { profile: null, error: 'Temple not found.', statusCode: 404 };
  const status = String(profile.status || '').toLowerCase();
  // Allow active temples fully. Allow pending temples to load the shell (creator preview)
  // but signal the shell that it is in pending/preview state via the error field.
  if (status === 'active') {
    return { profile, error: null, statusCode: 200 };
  }
  if (status === 'pending') {
    return { profile, error: null, statusCode: 200 };
  }
  // suspended or any other non-publishable status
  return {
    profile,
    error: 'This temple microsite has been suspended.',
    statusCode: 403,
  };
}

async function listPublishedTempleProfiles() {
  const map = new Map();

  if (shouldUseSupabase()) {
    try {
      const TIMEOUT = 3000;
      const tOut = new Promise((_, rej) => setTimeout(() => rej(new Error('Supabase timeout')), TIMEOUT));
      await Promise.race([
        (async () => {
          const { data: registryRows, error: registryError } = await supabase
            .from('registered_temples')
            .select('slug, status, created_at, updated_at')
            .eq('status', 'active')
            .order('updated_at', { ascending: false });
          if (registryError) throw registryError;
          const slugs = (registryRows || []).map((row) => row.slug).filter(Boolean);
          if (slugs.length) {
            const { data: profiles, error: profileError } = await supabase
              .from('temple_profiles')
              .select('*')
              .in('slug', slugs);
            if (profileError) throw profileError;
            const profileMap = new Map((profiles || []).map((profile) => [profile.slug, profile]));
            for (const row of registryRows || []) {
              const profile = profileMap.get(row.slug);
              if (!profile) continue;
              map.set(row.slug, stripTempleSecrets({
                ...profile,
                status: row.status,
                created_at: row.created_at,
                updated_at: row.updated_at,
                theme_vars: buildTempleThemeCssVars(profile),
              }));
            }
          }
        })(),
        tOut,
      ]);
    } catch (error) {
      markSupabaseUnavailable(error, 'published temple list');
    }
  }

  const localProfiles = await listLocalTempleProfiles('active');
  for (const profile of localProfiles) {
    if (map.has(profile.slug)) continue;
    map.set(profile.slug, stripTempleSecrets({
      ...profile,
      theme_vars: buildTempleThemeCssVars(profile),
    }));
  }

  return Array.from(map.values()).sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}


async function fetchTicketInventoryById(ticketId) {
  if (!supabase || !ticketId) return null;
  const { data, error } = await supabase.from('ticket_inventory').select('*').eq('id', ticketId).maybeSingle();
  if (error) throw error;
  return sanitizeTicketRecord(data);
}

function buildTicketInventoryPayload(input = {}, existingRecord = null) {
  const eventName = String(input.event_name ?? existingRecord?.event_name ?? '').trim();
  const ticketType = String(input.ticket_type ?? existingRecord?.ticket_type ?? '').trim();
  const templeKey = String(input.temple_key ?? existingRecord?.temple_key ?? '').trim();
  const templeSlugRaw = String(input.temple_slug ?? existingRecord?.temple_slug ?? '').trim();
  const templeSlug = templeSlugRaw ? slugify(templeSlugRaw) : null;
  const price = Number(input.price ?? existingRecord?.price ?? 0);
  const totalSeats = Math.max(0, toInteger(input.total_seats ?? existingRecord?.total_seats ?? 0, 0));
  const bookingLimit = Math.max(1, toInteger(input.booking_limit ?? existingRecord?.booking_limit ?? 1, 1));
  const manualStatus = normalizeTicketStatus(input.status ?? existingRecord?.status ?? DEFAULT_TICKET_STATUS);
  const bookingEnabled = input.booking_enabled !== undefined
    ? toBoolean(input.booking_enabled, true)
    : existingRecord?.booking_enabled !== false;
  const existingBooked = Math.max(0, toInteger(existingRecord?.booked_seats ?? 0, 0));
  const incomingBooked = input.booked_seats !== undefined ? Math.max(0, toInteger(input.booked_seats, existingBooked)) : existingBooked;
  const bookedSeats = Math.min(totalSeats, incomingBooked);
  const explicitAvailable = input.available_seats !== undefined ? Math.max(0, toInteger(input.available_seats, 0)) : null;
  const computedAvailable = computeAvailableSeats(totalSeats, bookedSeats);
  const availableSeats = Math.min(totalSeats, explicitAvailable === null ? computedAvailable : explicitAvailable);
  const derivedStatus = availableSeats <= 0 ? 'SOLD_OUT' : manualStatus;

  if (!eventName) throw new Error('Event name is required.');
  if (!ticketType) throw new Error('Ticket type is required.');
  if (!templeKey) throw new Error('Temple key is required.');
  if (!Number.isFinite(price) || price < 0) throw new Error('Price must be zero or greater.');
  if (totalSeats < 0) throw new Error('Total seats must be zero or greater.');
  if (bookingLimit < 1) throw new Error('Booking limit must be at least 1.');

  return {
    temple_key: templeKey,
    temple_slug: templeSlug,
    event_name: eventName,
    ticket_type: ticketType,
    price,
    total_seats: totalSeats,
    available_seats: availableSeats,
    booked_seats: bookedSeats,
    booking_limit: bookingLimit,
    status: derivedStatus,
    event_date: input.event_date || existingRecord?.event_date || null,
    event_time: input.event_time || existingRecord?.event_time || null,
    description: input.description || existingRecord?.description || null,
    booking_enabled: bookingEnabled && derivedStatus === 'OPEN',
    updated_at: new Date().toISOString(),
  };
}

async function reserveTicketInventory(ticketId, qty) {
  if (!supabase || !ticketId) return null;

  try {
    const { data, error } = await supabase.rpc('reserve_ticket_inventory', {
      p_ticket_id: ticketId,
      p_qty: qty,
    });
    if (!error && data) {
      const updated = Array.isArray(data) ? data[0] : data;
      return sanitizeTicketRecord(updated);
    }
  } catch (error) {
    console.warn('[divyadarshan] ticket reserve rpc fallback:', error?.message || error);
  }

  const existing = await fetchTicketInventoryById(ticketId);
  if (!existing) throw new Error('Ticket not found.');
  if (existing.booking_enabled === false) throw new Error('Ticket booking is disabled.');
  if (normalizeTicketStatus(existing.status) !== 'OPEN') throw new Error('Ticket is not open for booking.');
  if (qty > Math.max(1, toInteger(existing.booking_limit, 1))) throw new Error('Requested quantity exceeds booking limit.');
  if (toInteger(existing.available_seats, 0) < qty) throw new Error('Not enough seats available.');

  const nextAvailable = Math.max(0, toInteger(existing.available_seats, 0) - qty);
  const nextBooked = Math.max(0, toInteger(existing.booked_seats, 0) + qty);
  const nextStatus = nextAvailable <= 0 ? 'SOLD_OUT' : 'OPEN';

  const { data, error } = await supabase
    .from('ticket_inventory')
    .update({
      available_seats: nextAvailable,
      booked_seats: nextBooked,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select('*')
    .single();
  if (error) throw error;
  return sanitizeTicketRecord(data);
}

async function releaseTicketInventory(ticketId, qty) {
  if (!supabase || !ticketId) return null;

  try {
    const { data, error } = await supabase.rpc('release_ticket_inventory', {
      p_ticket_id: ticketId,
      p_qty: qty,
    });
    if (!error && data) {
      const updated = Array.isArray(data) ? data[0] : data;
      return sanitizeTicketRecord(updated);
    }
  } catch (error) {
    console.warn('[divyadarshan] ticket release rpc fallback:', error?.message || error);
  }

  const existing = await fetchTicketInventoryById(ticketId);
  if (!existing) throw new Error('Ticket not found.');

  const nextBooked = Math.max(0, toInteger(existing.booked_seats, 0) - qty);
  const nextAvailable = Math.min(toInteger(existing.total_seats, 0), toInteger(existing.available_seats, 0) + qty);
  const nextStatus =
    normalizeTicketStatus(existing.status) === 'SOLD_OUT' && nextAvailable > 0 ? 'OPEN' : normalizeTicketStatus(existing.status);

  const { data, error } = await supabase
    .from('ticket_inventory')
    .update({
      available_seats: nextAvailable,
      booked_seats: nextBooked,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select('*')
    .single();
  if (error) throw error;
  return sanitizeTicketRecord(data);
}

async function ensureBookingAvailable(res) {
  const state = await bookingControl.getState();
  if (state.paused) {
    res.status(503).json(buildBookingPausedPayload(state));
    return { blocked: true, state };
  }
  return { blocked: false, state };
}

async function createMacroBooking(req, res) {
  const bookingGate = await ensureBookingAvailable(res);
  if (bookingGate.blocked) return;
  if (!requireSupabase(req, res)) return;

  const {
    id,
    temple_key,
    temple_name,
    visit_date,
    slot,
    qty,
    phone,
    ticket_type,
    source,
    status,
    temple_slug,
    ticket_inventory_id,
    event_name,
  } = req.body || {};

  if (!id || !temple_key || !temple_name || !qty) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  let reservedTicket = null;
  const requestedQty = Number(qty);

  if (ticket_inventory_id) {
    try {
      const ticket = await fetchTicketInventoryById(ticket_inventory_id);
      if (!ticket) return res.status(404).json({ error: 'Selected ticket was not found.' });
      if (ticket.temple_key !== temple_key) {
        return res.status(400).json({ error: 'Selected ticket does not belong to the chosen temple.' });
      }
      if (requestedQty > Number(ticket.booking_limit || 1)) {
        return res.status(400).json({ error: `You can book up to ${ticket.booking_limit} seats for this ticket.` });
      }

      reservedTicket = await reserveTicketInventory(ticket_inventory_id, requestedQty);
      broadcastTicketEvent('reserved', reservedTicket);
    } catch (error) {
      return res.status(409).json({ error: error.message || 'Ticket is not available for booking.' });
    }
  }

  const payload = {
    id,
    temple_key,
    temple_name,
    temple_slug: temple_slug || reservedTicket?.temple_slug || null,
    visit_date: visit_date || reservedTicket?.event_date || null,
    slot: slot || reservedTicket?.event_time || null,
    qty: requestedQty,
    phone: phone || null,
    ticket_type: ticket_type || reservedTicket?.ticket_type || null,
    source: source || 'Online',
    status: status || 'Pending',
    ticket_inventory_id: ticket_inventory_id || null,
    event_name: event_name || reservedTicket?.event_name || null,
  };

  const { data, error } = await supabase.from('bookings').insert(payload).select('*').single();
  if (error) {
    if (reservedTicket) {
      try {
        const restored = await releaseTicketInventory(reservedTicket.id, requestedQty);
        broadcastTicketEvent('restored', restored);
      } catch (restoreError) {
        console.warn('[divyadarshan] failed to restore ticket seats after booking insert error:', restoreError?.message || restoreError);
      }
    }
    return res.status(500).json({ error: error.message });
  }
  broadcastBookingEvent('created', data);

  // Send booking confirmation email immediately
  sendBookingConfirmationEmail(data)
    .catch((emailErr) => console.warn('[divyadarshan] Immediate confirmation email trigger failed:', emailErr?.message || emailErr));


  if (payload.phone) {
    const to = normalizeTwilioTo(payload.phone);
    if (to) {
      const body = buildBookingConfirmationText(payload);
      twilioSendMessage({ to, body })
        .then(() => {})
        .catch((sendError) => console.warn('[divyadarshan] Twilio send failed:', sendError?.message || sendError));
    }
  }

  res.status(201).json({
    ...data,
    ticket_inventory: reservedTicket,
    total_amount: reservedTicket ? Number(reservedTicket.price || 0) * requestedQty : undefined,
  });
}

function stripTempleSecrets(profile) {
  if (!profile) return profile;
  const next = { ...profile };
  delete next.admin_password_hash;
  return next;
}

function upsertArrayItem(items, nextItem, keyCandidates = ['id']) {
  const list = Array.isArray(items) ? [...items] : [];
  const normalized = nextItem && typeof nextItem === 'object' ? { ...nextItem } : {};
  const key =
    keyCandidates
      .map((candidate) => normalized[candidate])
      .find((value) => value !== undefined && value !== null && String(value).trim()) ||
    slugify(normalized.name || normalized.title || `item-${Date.now()}`) ||
    crypto.randomUUID();
  normalized.id = key;

  const index = list.findIndex((item) => keyCandidates.some((candidate) => item?.[candidate] === key || item?.id === key));
  if (index >= 0) list[index] = { ...list[index], ...normalized };
  else list.unshift(normalized);
  return list;
}

const ALLOWED_SCRAPE_HOSTS = new Set(['www.ttdsevaonline.net', 'ttdsevaonline.net']);

function isAllowedUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return false;
    return ALLOWED_SCRAPE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

async function scrapeTempleArticle(url) {
  const resp = await fetch(url, {
    headers: {
      'user-agent':
        'DivyaDarshanBot/1.0 (educational project; contact: local-dev) Node.js fetch',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!resp.ok) throw new Error(`Fetch failed (${resp.status})`);
  const html = await resp.text();
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text().trim() ||
    $('h1').first().text().trim();

  // Most WP pages: .entry-content contains the useful text
  const entry = $('.entry-content').first();
  const contentHtml = entry.length ? entry.html() : $('body').html();

  const textSample = (entry.length ? entry.text() : $('body').text())
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

  return { title: title || 'Temple details', contentHtml: contentHtml || '', textSample };
}

async function geocodePlace(query) {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q: query, format: 'json', limit: '1' }).toString();
  const resp = await fetch(url, {
    headers: { 'user-agent': 'DivyaDarshan/1.0 (local dev)' },
  });
  if (!resp.ok) throw new Error(`Geocoding failed (${resp.status})`);
  const data = await resp.json();
  if (!data || data.length === 0) return null;
  return { lat: Number(data[0].lat), lon: Number(data[0].lon), displayName: data[0].display_name };
}

async function googleGeocode(query) {
  if (!GOOGLE_API_KEY) throw new Error('Missing GOOGLE_API_KEY');
  const url =
    'https://maps.googleapis.com/maps/api/geocode/json?' +
    new URLSearchParams({ address: query, key: GOOGLE_API_KEY }).toString();
  const resp = await fetch(url);
  const json = await resp.json();
  if (json.status !== 'OK' || !json.results?.[0]) {
    const msg = json?.error_message ? ` (${json.error_message})` : '';
    throw new Error(`Google Geocode failed: ${json.status}${msg}`);
  }
  const r = json.results[0];
  return {
    lat: r.geometry.location.lat,
    lon: r.geometry.location.lng,
    displayName: r.formatted_address,
    placeId: r.place_id,
  };
}

async function googleNearby({ lat, lon, radius, type, keyword }) {
  if (!GOOGLE_API_KEY) throw new Error('Missing GOOGLE_API_KEY');
  const url =
    'https://maps.googleapis.com/maps/api/place/nearbysearch/json?' +
    new URLSearchParams({
      location: `${lat},${lon}`,
      radius: String(radius || 3000),
      type: type || '',
      keyword: keyword || '',
      key: GOOGLE_API_KEY,
    }).toString();
  const resp = await fetch(url);
  const json = await resp.json();
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places Nearby failed: ${json.status}`);
  }
  return json.results || [];
}

async function googleDirections({ origin, destLat, destLon }) {
  if (!GOOGLE_API_KEY) throw new Error('Missing GOOGLE_API_KEY');
  const url =
    'https://maps.googleapis.com/maps/api/directions/json?' +
    new URLSearchParams({
      origin,
      destination: `${destLat},${destLon}`,
      mode: 'driving',
      departure_time: 'now',
      key: GOOGLE_API_KEY,
    }).toString();
  const resp = await fetch(url);
  const json = await resp.json();
  if (json.status !== 'OK' || !json.routes?.[0]?.legs?.[0]) throw new Error(`Google Directions failed: ${json.status}`);
  const leg = json.routes[0].legs[0];
  return {
    distance_text: leg.distance?.text || '',
    duration_text: leg.duration?.text || '',
    duration_in_traffic_text: leg.duration_in_traffic?.text || leg.duration?.text || '',
    googleMapsUrl:
      'https://www.google.com/maps/dir/?api=1&origin=' +
      encodeURIComponent(origin) +
      '&destination=' +
      encodeURIComponent(`${destLat},${destLon}`),
  };
}

async function osrmRoute(from, to) {
  // Public OSRM server (no traffic; shortest/fastest based on typical speeds)
  const url =
    'https://router.project-osrm.org/route/v1/driving/' +
    `${from.lon},${from.lat};${to.lon},${to.lat}` +
    '?' +
    new URLSearchParams({
      overview: 'full',
      geometries: 'geojson',
      steps: 'false',
    }).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const resp = await fetch(url, { headers: { 'user-agent': 'DivyaDarshan/1.0 (local dev)' }, signal: controller.signal });
  clearTimeout(timeout);
  if (!resp.ok) throw new Error(`OSRM failed (${resp.status})`);
  const json = await resp.json();
  const route = json?.routes?.[0];
  if (!route) throw new Error('OSRM returned no route');
  return {
    distance_m: route.distance,
    duration_s: route.duration,
    geometry: route.geometry, // GeoJSON LineString
  };
}

const wikiCache = new Map(); // key -> { value, expiresAt }
function cacheGet(key) {
  const v = wikiCache.get(key);
  if (!v) return null;
  if (Date.now() > v.expiresAt) {
    wikiCache.delete(key);
    return null;
  }
  return v.value;
}
function cacheSet(key, value, ttlMs) {
  wikiCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function wikiThumbnailForName(name) {
  const key = `wikiThumb:${name}`;
  const cached = cacheGet(key);
  if (cached !== null) return cached;

  const q = String(name || '').trim();
  if (!q) return null;

  // 1) Search
  const searchUrl =
    'https://en.wikipedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: q,
      format: 'json',
      origin: '*',
      srlimit: '1',
    }).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const resp = await fetch(searchUrl, { signal: controller.signal, headers: { 'user-agent': 'DivyaDarshan/1.0 (local dev)' } });
  clearTimeout(timeout);
  if (!resp.ok) {
    cacheSet(key, null, 10 * 60_000);
    return null;
  }
  const json = await resp.json();
  const title = json?.query?.search?.[0]?.title;
  if (!title) {
    cacheSet(key, null, 10 * 60_000);
    return null;
  }

  // 2) Get summary with thumbnail
  const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const resp2 = await fetch(sumUrl, { headers: { 'user-agent': 'DivyaDarshan/1.0 (local dev)' } });
  if (!resp2.ok) {
    cacheSet(key, null, 10 * 60_000);
    return null;
  }
  const sum = await resp2.json();
  const thumb = sum?.thumbnail?.source || null;
  cacheSet(key, thumb, 24 * 60 * 60_000);
  return thumb;
}

async function overpassNearby(lat, lon, radiusMeters) {
  const qForRadius = (r) => `
[out:json][timeout:25];
(
  node(around:${r},${lat},${lon})["amenity"~"hotel|guest_house|hostel|restaurant|cafe"];
  node(around:${r},${lat},${lon})["tourism"~"attraction|museum|viewpoint"];
);
out body 60;
`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter',
  ];

  const radii = [radiusMeters, Math.floor(radiusMeters * 0.6), Math.floor(radiusMeters * 0.4)];

  let lastErr = null;
  for (const r of radii) {
    const q = qForRadius(r);
    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(ep, {
          method: 'POST',
          headers: { 'content-type': 'text/plain', 'user-agent': 'DivyaDarshan/1.0 (local dev)' },
          body: q,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!resp.ok) {
          lastErr = new Error(`Overpass failed (${resp.status}) @ ${ep}`);
          continue;
        }
        const json = await resp.json();
        return json?.elements || [];
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr || new Error('Overpass failed');
}

function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function geminiGenerateJson(prompt) {
  if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
  // Pick an available model dynamically (different projects/regions expose different sets).
  async function listModels() {
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(GEMINI_API_KEY),
      { headers: { 'user-agent': 'DivyaDarshan/1.0 (local dev)' } }
    );
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error(`Gemini ListModels failed (${resp.status}): ${t}`);
    }
    const json = await resp.json();
    const models = (json?.models || []).filter(
      (m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
    );
    if (models.length === 0) throw new Error('No Gemini model supports generateContent for this key');
    return models.map((m) => m.name).filter(Boolean);
  }

  const modelNames = await listModels();
  // Prefer faster/cheaper "flash" models when available.
  modelNames.sort((a, b) => {
    const aFlash = /flash/i.test(a) ? 0 : 1;
    const bFlash = /flash/i.test(b) ? 0 : 1;
    if (aFlash !== bFlash) return aFlash - bFlash;
    return a.localeCompare(b);
  });

  const makeReq = async (modelName) => {
    const endpoint =
      'https://generativelanguage.googleapis.com/v1beta/' +
      modelName +
      ':generateContent?key=' +
      encodeURIComponent(GEMINI_API_KEY);
    return await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
      }),
    });
  };

  let lastErrText = '';
  for (const modelName of modelNames.slice(0, 5)) {
    // retry a couple times on transient 503/429
    for (let attempt = 0; attempt < 3; attempt++) {
      const resp = await makeReq(modelName);
      if (resp.ok) {
        const out = await resp.json();
        const text = out?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('Gemini returned no JSON');
        return JSON.parse(text.slice(start, end + 1));
      }
      const status = resp.status;
      lastErrText = await resp.text().catch(() => '');
      if (status === 503 || status === 429) {
        const delayMs = 800 * (attempt + 1);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      break; // try next model
    }
  }
  throw new Error(`Gemini failed: ${lastErrText || 'unavailable'}`);

}

async function geminiGenerateText(prompt) {
  if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');
  const listResp = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(GEMINI_API_KEY)
  );
  if (!listResp.ok) throw new Error(`Gemini ListModels failed (${listResp.status})`);
  const listJson = await listResp.json();
  const names = (listJson?.models || [])
    .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => m.name)
    .filter(Boolean)
    .sort((a, b) => (/flash/i.test(a) ? -1 : 1) - (/flash/i.test(b) ? -1 : 1));
  if (!names.length) throw new Error('No Gemini models available for generateContent');

  let lastErr = '';
  for (const modelName of names.slice(0, 3)) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${encodeURIComponent(
          GEMINI_API_KEY
        )}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
          }),
        }
      );
      if (resp.ok) {
        const out = await resp.json();
        return out?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      lastErr = await resp.text().catch(() => '');
      if (resp.status === 503 || resp.status === 429) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw new Error(`Gemini unavailable: ${lastErr}`);
}

async function groqChat({ messages, model, temperature }) {
  if (!GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || 'llama-3.1-8b-instant',
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Groq failed (${resp.status}): ${t}`);
  }
  return await resp.json();
}

async function groqGenerateText(prompt, opts) {
  const messages = [{ role: 'user', content: prompt }];
  // Try a couple fast models
  const models = ['llama-3.1-8b-instant', 'llama3-8b-8192'];
  let lastErr = null;
  for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const out = await groqChat({ messages, model: m, temperature: opts?.temperature });
        const text = out?.choices?.[0]?.message?.content || '';
        if (text) return text;
        lastErr = new Error('Groq returned empty content');
      } catch (e) {
        lastErr = e;
        // brief retry on transient errors
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error('Groq unavailable');
}

async function groqGenerateFromMessages(messages, opts) {
  // Try a couple fast models
  const models = ['llama-3.1-8b-instant', 'llama3-8b-8192'];
  let lastErr = null;
  for (const m of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const out = await groqChat({ messages, model: m, temperature: opts?.temperature });
        const text = out?.choices?.[0]?.message?.content || '';
        if (text) return text;
        lastErr = new Error('Groq returned empty content');
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error('Groq unavailable');
}

async function groqGenerateJson(prompt) {
  const text = await groqGenerateText(
    prompt +
      '\n\nReturn STRICT JSON only (no markdown, no extra text).'
  );
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Groq returned no JSON');
  return JSON.parse(text.slice(start, end + 1));
}

function fallbackAssistantReply(message, context) {
  const m = String(message || '').toLowerCase();
  const temple = context?.temple ? String(context.temple) : 'the temple';
  const date = context?.date ? String(context.date) : '';
  const budget = context?.budget ? String(context.budget) : '';

  const lines = [];
  lines.push(`AI is temporarily busy. Here’s a practical plan using the info you provided.`);
  lines.push('');
  lines.push(`Temple: ${temple}${date ? ` · Date: ${date}` : ''}${budget ? ` · Budget: ${budget}` : ''}`);
  lines.push('');

  if (m.includes('hotel') || m.includes('stay')) {
    lines.push('- Stay tips');
    lines.push(`  - Prefer hotels/guest houses within 1–3 km of ${temple} for easier early-morning access.`);
    lines.push('  - Check: parking, cancellation, check-in time, and last-mile transport.');
    lines.push('  - Use the “Maps” button to compare options and reviews in real time.');
    lines.push('');
  }

  if (m.includes('route') || m.includes('reach') || m.includes('bus') || m.includes('train') || m.includes('car')) {
    lines.push('- Route tips');
    lines.push('  - Start early to avoid peak traffic and long queues.');
    lines.push('  - Keep 45–60 min buffer near the temple for parking + footwear counter.');
    lines.push('');
  }

  if (m.includes('timing') || m.includes('time') || m.includes('open') || m.includes('darshan')) {
    lines.push('- Timings');
    lines.push('  - Temple timings can change by day/festival.');
    lines.push('  - If you’ve scraped the temple source page in the backend, I can show source-based timing facts here.');
    lines.push('');
  }

  lines.push('- Checklist');
  lines.push('  - Carry ID, minimal cash, and water');
  lines.push('  - Follow dress code rules');
  lines.push('  - Keep power bank + network for maps/tickets');

  lines.push('');
  lines.push('Try again in a minute; Gemini demand spikes are usually temporary.');
  return lines.join('\n');
}

// ---------- API ----------

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/version', (req, res) => {
  res.json({ buildId: BUILD_ID });
});

app.get('/api/admin/booking-control', async (req, res) => {
  const state = await bookingControl.getState();
  const audit = req.query?.includeAudit === 'true' ? await bookingControl.getAuditLog() : undefined;
  res.json({ ...state, audit: audit || undefined });
});

app.post('/api/admin/booking-control', bookingControl.adminAuth, async (req, res) => {
  const paused = toBoolean(req.body?.paused, false);
  const nextState = await bookingControl.setState(
    {
      paused,
      reason: req.body?.reason || '',
      resumeAt: req.body?.resumeAt || null,
      adminId: req.bookingControlAdminId || 'global-admin',
      pausedAt: paused ? new Date().toISOString() : null,
    },
    { action: paused ? 'paused' : 'resumed' }
  );
  const audit = await bookingControl.getAuditLog();
  res.json({ ...nextState, audit });
});

app.get('/api/admin/booking-control/stream', (req, res) => {
  bookingControl.attachSse(req, res);
});

app.get('/api/tickets/stream', (req, res) => {
  res.setHeader('content-type', 'text/event-stream');
  res.setHeader('cache-control', 'no-cache');
  res.setHeader('connection', 'keep-alive');
  res.flushHeaders?.();
  ticketEventClients.add(res);
  res.write(`event: ticket-update\n`);
  res.write(`data: ${JSON.stringify({ type: 'ready', ticket: null, timestamp: new Date().toISOString() })}\n\n`);
  req.on('close', () => {
    ticketEventClients.delete(res);
    res.end();
  });
});

app.get('/api/admin/bookings/stream', (req, res) => {
  res.setHeader('content-type', 'text/event-stream');
  res.setHeader('cache-control', 'no-cache');
  res.setHeader('connection', 'keep-alive');
  res.flushHeaders?.();
  bookingEventClients.add(res);
  res.write(`event: booking-update\n`);
  res.write(`data: ${JSON.stringify({ type: 'ready', booking: null, timestamp: new Date().toISOString() })}\n\n`);
  req.on('close', () => {
    bookingEventClients.delete(res);
    res.end();
  });
});

app.get('/api/tickets', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const templeKey = req.query?.temple_key ? String(req.query.temple_key).trim() : '';
  const templeSlug = req.query?.temple_slug ? slugify(req.query.temple_slug) : '';
  const status = req.query?.status ? normalizeTicketStatus(req.query.status, '') : '';
  const activeOnly = toBoolean(req.query?.activeOnly, false);

  let query = supabase.from('ticket_inventory').select('*').order('event_date', { ascending: true }).order('created_at', { ascending: false });
  if (templeKey) query = query.eq('temple_key', templeKey);
  if (templeSlug) query = query.eq('temple_slug', templeSlug);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let tickets = (data || []).map(sanitizeTicketRecord);
  if (activeOnly) {
    tickets = tickets.filter((ticket) => ticket.booking_enabled !== false && ticket.status === 'OPEN');
  }

  res.json({ tickets });
});

app.get('/api/tickets/active', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const templeKey = req.query?.temple_key ? String(req.query.temple_key).trim() : '';
  const templeSlug = req.query?.temple_slug ? slugify(req.query.temple_slug) : '';

  let query = supabase
    .from('ticket_inventory')
    .select('*')
    .eq('status', 'OPEN')
    .eq('booking_enabled', true)
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (templeKey) query = query.eq('temple_key', templeKey);
  if (templeSlug) query = query.eq('temple_slug', templeSlug);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ tickets: (data || []).map(sanitizeTicketRecord) });
});

app.get('/api/admin/tickets', bookingControl.adminAuth, async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const templeKey = req.query?.temple_key ? String(req.query.temple_key).trim() : '';
  const templeSlug = req.query?.temple_slug ? slugify(req.query.temple_slug) : '';
  let query = supabase.from('ticket_inventory').select('*').order('created_at', { ascending: false });
  if (templeKey) query = query.eq('temple_key', templeKey);
  if (templeSlug) query = query.eq('temple_slug', templeSlug);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const tickets = (data || []).map(sanitizeTicketRecord);
  const summary = {
    totalTickets: tickets.length,
    totalBookings: tickets.reduce((sum, ticket) => sum + Number(ticket.booked_seats || 0), 0),
    availableSeats: tickets.reduce((sum, ticket) => sum + Number(ticket.available_seats || 0), 0),
    soldOutEvents: tickets.filter((ticket) => ticket.status === 'SOLD_OUT').length,
    activeEvents: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    closedEvents: tickets.filter((ticket) => ticket.status === 'CLOSED').length,
    blockedEvents: tickets.filter((ticket) => ticket.status === 'BLOCKED').length,
    revenue: tickets.reduce((sum, ticket) => sum + Number(ticket.booked_seats || 0) * Number(ticket.price || 0), 0),
  };

  res.json({ tickets, summary });
});

app.post('/api/admin/tickets', bookingControl.adminAuth, async (req, res) => {
  if (!requireSupabase(req, res)) return;

  try {
    const payload = buildTicketInventoryPayload(req.body || {});
    let duplicateQuery = supabase
      .from('ticket_inventory')
      .select('id')
      .eq('temple_key', payload.temple_key)
      .eq('event_name', payload.event_name)
      .eq('ticket_type', payload.ticket_type)
      .limit(1);
    duplicateQuery = payload.event_date ? duplicateQuery.eq('event_date', payload.event_date) : duplicateQuery.is('event_date', null);
    const { data: duplicate } = await duplicateQuery;
    if (duplicate?.length) {
      return res.status(409).json({ error: 'A matching ticket already exists for this temple and date.' });
    }

    const { data, error } = await supabase.from('ticket_inventory').insert(payload).select('*').single();
    if (error) return res.status(500).json({ error: error.message });
    const ticket = sanitizeTicketRecord(data);
    broadcastTicketEvent('created', ticket);
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/admin/tickets/:id', bookingControl.adminAuth, async (req, res) => {
  if (!requireSupabase(req, res)) return;

  try {
    const existing = await fetchTicketInventoryById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Ticket not found.' });

    const payload = buildTicketInventoryPayload(req.body || {}, existing);
    const { data, error } = await supabase
      .from('ticket_inventory')
      .update(payload)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    const ticket = sanitizeTicketRecord(data);
    broadcastTicketEvent('updated', ticket);
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/tickets/:id/status', bookingControl.adminAuth, async (req, res) => {
  if (!requireSupabase(req, res)) return;

  try {
    const existing = await fetchTicketInventoryById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Ticket not found.' });

    const nextStatus = normalizeTicketStatus(req.body?.status, existing.status);
    const nextAvailable = nextStatus === 'SOLD_OUT' ? 0 : Number(existing.available_seats || 0);
    const payload = {
      status: nextAvailable <= 0 ? 'SOLD_OUT' : nextStatus,
      available_seats: nextAvailable,
      booking_enabled: nextStatus === 'OPEN',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('ticket_inventory')
      .update(payload)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    const ticket = sanitizeTicketRecord(data);
    broadcastTicketEvent('status', ticket);
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/admin/tickets/:id/seats', bookingControl.adminAuth, async (req, res) => {
  if (!requireSupabase(req, res)) return;

  try {
    const existing = await fetchTicketInventoryById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Ticket not found.' });

    const mode = String(req.body?.mode || 'set').trim().toLowerCase();
    const delta = toInteger(req.body?.delta, 0);
    let totalSeats = Number(existing.total_seats || 0);

    if (mode === 'increase') totalSeats += Math.max(0, delta);
    else if (mode === 'decrease') totalSeats = Math.max(Number(existing.booked_seats || 0), totalSeats - Math.max(0, delta));
    else if (mode === 'set') totalSeats = Math.max(Number(existing.booked_seats || 0), toInteger(req.body?.total_seats, totalSeats));

    const availableSeats = Math.max(0, totalSeats - Number(existing.booked_seats || 0));
    const nextStatus = availableSeats <= 0 ? 'SOLD_OUT' : normalizeTicketStatus(existing.status === 'SOLD_OUT' ? 'OPEN' : existing.status);

    const { data, error } = await supabase
      .from('ticket_inventory')
      .update({
        total_seats: totalSeats,
        available_seats: availableSeats,
        status: nextStatus,
        booking_enabled: nextStatus === 'OPEN',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    const ticket = sanitizeTicketRecord(data);
    broadcastTicketEvent('seats', ticket);
    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/admin/tickets/:id', bookingControl.adminAuth, async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const existing = await fetchTicketInventoryById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found.' });
  if (Number(existing.booked_seats || 0) > 0) {
    return res.status(409).json({ error: 'Booked tickets cannot be deleted. Close or block the ticket instead.' });
  }

  const { error } = await supabase.from('ticket_inventory').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  broadcastTicketEvent('deleted', existing);
  res.json({ ok: true });
});

app.get('/api/booking/slots', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  try {
    const state = await bookingControl.getState();
    const slug = slugify(req.query?.slug || req.query?.templeSlug || req.query?.temple_slug);
    if (!slug) {
      return res.json({
        bookingPaused: Boolean(state.paused),
        reason: state.reason || '',
        resumeAt: state.resumeAt || null,
        slots: [],
      });
    }

    const profile = await fetchTempleProfile(slug);
    if (!profile) return res.status(404).json({ error: 'Temple not found.' });
    const slots = await buildTempleSlotsWithAvailability(profile, req.query?.date);
    res.json({
      bookingPaused: Boolean(state.paused),
      reason: state.reason || '',
      resumeAt: state.resumeAt || null,
      templeSlug: slug,
      slots,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/booking/:id', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Booking not found.' });

  const response = {
    ...data,
    qr_code_url: buildQrCodeUrl(`ticket:${data.id}`),
  };

  if (data.temple_slug) {
    try {
      const profile = await fetchTempleProfile(data.temple_slug);
      if (profile) {
        response.temple_profile = stripTempleSecrets({
          slug: profile.slug,
          temple_name: profile.temple_name,
          address_line1: profile.address_line1,
          address_line2: profile.address_line2,
          city: profile.city,
          state: profile.state,
          pincode: profile.pincode,
          admin_phone: profile.admin_phone,
          logo_url: profile.logo_url,
        });
      }
    } catch (error) {}
  }

  res.json(response);
});

app.delete('/api/booking/:id', async (req, res) => {
  let existing = null;
  if (shouldUseSupabase()) {
    try {
      const response = await supabase
        .from('bookings')
        .select('*')
        .eq('id', req.params.id)
        .maybeSingle();
      if (response.error) throw response.error;
      existing = response.data;
    } catch (error) {
      console.warn('[divyadarshan] booking cancel lookup fell back to local activity store:', error?.message || error);
    }
  }
  if (!existing) {
    const store = await readLocalTempleActivityStore();
    existing = (store.bookings || []).find((booking) => booking.id === req.params.id) || null;
  }
  if (!existing) return res.status(404).json({ error: 'Booking not found.' });
  if (String(existing.status || '').toLowerCase() === 'cancelled') {
    return res.json({ ok: true, booking: existing });
  }

  let data = null;
  if (shouldUseSupabase()) {
    try {
      const response = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (response.error) throw response.error;
      data = response.data;
    } catch (error) {
      console.warn('[divyadarshan] booking cancel update fell back to local activity store:', error?.message || error);
    }
  }
  if (!data) {
    const store = await readLocalTempleActivityStore();
    const nextBookings = (store.bookings || []).map((booking) =>
      booking.id === req.params.id ? { ...booking, status: 'Cancelled', updated_at: new Date().toISOString() } : booking
    );
    data = nextBookings.find((booking) => booking.id === req.params.id);
    await writeLocalTempleActivityStore({ ...store, bookings: nextBookings });
  }

  if (existing.ticket_inventory_id && Number(existing.qty || 0) > 0) {
    try {
      const restored = await releaseTicketInventory(existing.ticket_inventory_id, Number(existing.qty || 0));
      if (restored) broadcastTicketEvent('restored', restored);
    } catch (restoreError) {
      console.warn('[divyadarshan] failed to restore ticket after booking cancel:', restoreError?.message || restoreError);
    }
  }

  broadcastBookingEvent('cancelled', data);
  res.json({
    ok: true,
    booking: {
      ...data,
      qr_code_url: buildQrCodeUrl(`ticket:${data.id}`),
    },
  });
});

app.get('/api/geo', async (req, res) => {
  const q = req.query?.q;
  if (!q) return res.status(400).json({ error: 'Missing q' });
  try {
    const geo = await geocodePlace(String(q));
    if (!geo) return res.status(404).json({ error: 'Not found' });
    res.json(geo);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Geocode failed' });
  }
});

app.get('/api/route', async (req, res) => {
  const fromLat = Number(req.query?.fromLat);
  const fromLon = Number(req.query?.fromLon);
  const toLat = Number(req.query?.toLat);
  const toLon = Number(req.query?.toLon);
  if (![fromLat, fromLon, toLat, toLon].every((n) => Number.isFinite(n))) {
    return res.status(400).json({ error: 'Missing/invalid coordinates' });
  }
  try {
    const route = await osrmRoute({ lat: fromLat, lon: fromLon }, { lat: toLat, lon: toLon });
    res.json(route);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Route failed' });
  }
});

app.get('/api/photo', async (req, res) => {
  const name = req.query?.name;
  if (!name) return res.status(400).json({ error: 'Missing name' });
  try {
    const url = await wikiThumbnailForName(String(name));
    res.json({ photoUrl: url });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Photo lookup failed' });
  }
});

// Google Places Photo proxy (keeps key off the client)
app.get('/api/google/photo', async (req, res) => {
  const ref = req.query?.ref;
  const maxwidth = req.query?.maxwidth || '600';
  if (!ref) return res.status(400).json({ error: 'Missing ref' });
  if (!GOOGLE_API_KEY) return res.status(500).json({ error: 'Missing GOOGLE_API_KEY' });
  const url =
    'https://maps.googleapis.com/maps/api/place/photo?' +
    new URLSearchParams({ maxwidth: String(maxwidth), photo_reference: String(ref), key: GOOGLE_API_KEY }).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const resp = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
  if (!resp.ok) return res.status(502).json({ error: `Google photo failed (${resp.status})` });
  res.setHeader('content-type', resp.headers.get('content-type') || 'image/jpeg');
  const buf = Buffer.from(await resp.arrayBuffer());
  res.send(buf);
});

app.post('/api/assistant', async (req, res) => {
  const { message, context, history } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing message' });
  try {
    const safeHistory = Array.isArray(history)
      ? history
          .filter((x) => x && typeof x === 'object')
          .map((x) => ({
            role: x.role === 'assistant' ? 'assistant' : 'user',
            content: typeof x.content === 'string' ? x.content : '',
          }))
          .filter((x) => x.content.trim())
          .slice(-10)
      : [];

    const system = [
      `You are Divya Darshan AI — a helpful, natural, ChatGPT-like assistant for temple trips.`,
      `Be conversational and SPECIFIC to the user's latest message.`,
      `Do NOT repeat the same template every time.`,
      `Only include the sections the user asked for. If the user says "hello", reply briefly and ask one helpful question.`,
      `If you don't have verified facts (timings, prices, ratings), say "I don't have verified data" and give safe steps to check.`,
      `When listing hotels/places, prefer those in context.lastPlan if provided; otherwise give search steps and ask for city/date.`,
      ``,
      `Context JSON (may be empty):`,
      JSON.stringify(context || {}, null, 2),
    ].join('\n');

    const messages = [{ role: 'system', content: system }, ...safeHistory, { role: 'user', content: message }];

    // Groq first (faster), Gemini second (backup)
    let reply = '';
    try {
      reply = await groqGenerateFromMessages(messages, { temperature: 0.8 });
    } catch (e) {
      // Gemini wrapper is prompt-based; include a short transcript to reduce repetition.
      const transcript = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');
      reply = await geminiGenerateText(transcript);
    }
    res.json({ reply: reply || 'I could not generate a response right now.' });
  } catch (e) {
    // Graceful fallback when Gemini is overloaded/unavailable.
    res.json({ reply: fallbackAssistantReply(message, context), warning: e?.message || 'Assistant fallback used' });
  }
});

// Returns all app-configurable data blobs by temple slug.
// Table: temple_app_data(slug text pk, booking jsonb, parking jsonb, planner jsonb)
app.get('/api/bootstrap', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const { data, error } = await supabase.from('temple_app_data').select('*');
  if (error) return res.status(500).json({ error: error.message });

  const bookingData = {};
  const parkingData = {};
  const plannerData = {};

  for (const row of data || []) {
    if (row.booking) bookingData[row.slug] = row.booking;
    if (row.parking) parkingData[row.slug] = row.parking;
    if (row.planner) plannerData[row.slug] = row.planner;
  }

  res.json({ bookingData, parkingData, plannerData });
});

// Scrape & cache a temple article page from allowed hosts.
// Table: temple_pages(slug text pk, source_url text, title text, content_html text, updated_at timestamptz)
app.post('/api/scrape', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const { slug, url } = req.body || {};
  if (!slug || typeof slug !== 'string') return res.status(400).json({ error: 'Missing slug' });
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });
  if (!isAllowedUrl(url)) {
    return res.status(400).json({
      error: `URL not allowed. Allowed hosts: ${Array.from(ALLOWED_SCRAPE_HOSTS).join(', ')}`,
    });
  }

  try {
    const scraped = await scrapeTempleArticle(url);
    const upsertPayload = {
      slug,
      source_url: url,
      title: scraped.title,
      content_html: scraped.contentHtml,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('temple_pages').upsert(upsertPayload, { onConflict: 'slug' });
    if (error) return res.status(500).json({ error: error.message });

    res.json({ ok: true, slug, title: scraped.title, textSample: scraped.textSample });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Scrape failed' });
  }
});

app.get('/api/temple/check-slug/:slug', async (req, res) => {
  const slug = slugify(req.params.slug);
  if (!slug) return res.status(400).json({ error: 'Invalid slug' });
  try {
    let existing = null;
    if (shouldUseSupabase()) {
      const { data, error } = await supabase
        .from('registered_temples')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
      if (!error) existing = data;
    }
    if (!existing) {
      existing = await fetchLocalTempleProfile(slug);
    }
    res.json({ slug, available: !existing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/temple/register', async (req, res) => {
  try {
    const merged = { ...(req.body?.profile || {}), ...(req.body || {}) };
    const slug = deriveTempleRegistrationSlug(merged);
    const adminPassword = merged.admin_password || merged.password;

    if (!slug) return res.status(400).json({ error: 'Temple slug is required.' });
    if (!merged.temple_name) return res.status(400).json({ error: 'Temple name is required.' });
    if (!merged.admin_email) return res.status(400).json({ error: 'Admin email is required.' });
    if (!adminPassword || String(adminPassword).length < 8) {
      return res.status(400).json({ error: 'Admin password must be at least 8 characters.' });
    }

    const localExisting = await fetchLocalTempleProfile(slug);
    if (localExisting) return res.status(409).json({ error: 'This temple slug is already registered.' });

    if (shouldUseSupabase()) {
      try {
        const { data: existing, error: existingError } = await supabase
          .from('registered_temples')
          .select('slug')
          .eq('slug', slug)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existing) return res.status(409).json({ error: 'This temple slug is already registered.' });
      } catch (error) {
        console.warn('[divyadarshan] Supabase duplicate slug check failed, continuing with local publish fallback:', error?.message || error);
      }
    }

    const micrositeUrl = buildTempleMicrositeUrl(req, slug, true);
    const profilePayload = sanitizeTempleProfilePayload(merged);
    profilePayload.temple_name = String(merged.temple_name);
    profilePayload.admin_email = String(merged.admin_email).trim().toLowerCase();
    profilePayload.country = profilePayload.country || 'India';
    profilePayload.religion = profilePayload.religion || null;
    profilePayload.primary_color = profilePayload.primary_color || '#4c56af';
    profilePayload.secondary_color = profilePayload.secondary_color || '#f5a623';
    profilePayload.accent_color = profilePayload.accent_color || '#2ecc71';
    profilePayload.background_style = profilePayload.background_style || 'Light';
    profilePayload.theme_preset = profilePayload.theme_preset || null;
    profilePayload.booking_enabled = toBoolean(profilePayload.booking_enabled, true);
    profilePayload.slot_duration = profilePayload.slot_duration || 30;
    profilePayload.advance_booking_window = profilePayload.advance_booking_window || 7;
    profilePayload.features_enabled =
      profilePayload.features_enabled && typeof profilePayload.features_enabled === 'object'
        ? profilePayload.features_enabled
        : { darshan_booking: true };
    profilePayload.qr_code_url = buildQrCodeUrl(micrositeUrl);
    profilePayload.admin_password_hash = await bcrypt.hash(String(adminPassword), 12);
    profilePayload.is_preview = true;
    const hydratedProfilePayload = await hydrateTempleAssetFields(slug, profilePayload);
    const nowIso = new Date().toISOString();
    const registryRecord = {
      slug,
      status: 'pending',
      created_at: nowIso,
      updated_at: nowIso,
    };

    let createdProfile = { slug, ...hydratedProfilePayload };
    let persistedVia = 'local-store';

    if (shouldUseSupabase()) {
      try {
        const { error: registryError } = await supabase.from('registered_temples').insert(registryRecord);
        if (registryError) throw registryError;

        const { data: profileData, error: profileError } = await supabase
          .from('temple_profiles')
          .insert({ slug, ...hydratedProfilePayload })
          .select('*')
          .single();
        if (profileError) throw profileError;
        createdProfile = profileData;
        persistedVia = 'supabase';
        await touchTempleUpdatedAt(slug);
      } catch (error) {
        console.warn('[divyadarshan] Temple registration fell back to local store:', error?.message || error);
      }
    }

    await upsertLocalTempleRegistration({
      registry: registryRecord,
      profile: { slug, ...createdProfile, created_at: nowIso, updated_at: nowIso },
    });

    res.status(201).json({
      ok: true,
      slug,
      status: 'pending',
      persisted_via: persistedVia,
      microsite_url: buildTempleMicrositeUrl(req, slug),
      admin_login_url: `${buildTempleMicrositeUrl(req, slug)}/admin/login`,
      qr_code_url: createdProfile.qr_code_url,
      theme_vars: buildTempleThemeCssVars(createdProfile),
      profile: stripTempleSecrets(createdProfile),
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unable to register temple right now.' });
  }
});

app.post('/api/temple/:slug/keep', async (req, res) => {
  try {
    const slug = slugify(req.params.slug);
    if (!slug) return res.status(400).json({ error: 'Temple slug is required.' });

    const profile = await fetchTempleProfile(slug);
    if (!profile) return res.status(404).json({ error: 'Temple not found.' });

    if (profile.is_preview !== true) {
      return res.status(400).json({ error: 'This site is already permanently kept or not in preview mode.' });
    }

    if (shouldUseSupabase()) {
      try {
        const { error } = await supabase
          .from('temple_profiles')
          .update({ is_preview: false })
          .eq('slug', slug);
        if (error) throw error;
        await touchTempleUpdatedAt(slug);
      } catch (err) {
        console.warn('[divyadarshan] Keep endpoint Supabase update fell back to local:', err?.message || err);
      }
    }

    const updated = await updateLocalTempleProfile(slug, { is_preview: false });
    if (!updated) return res.status(404).json({ error: 'Temple not found locally.' });

    res.json({ ok: true, message: 'Temple microsite kept successfully.', profile: stripTempleSecrets(updated) });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unable to keep temple.' });
  }
});

app.delete('/api/temple/:slug', async (req, res) => {
  try {
    const slug = slugify(req.params.slug);
    if (!slug) return res.status(400).json({ error: 'Temple slug is required.' });

    const profile = await fetchTempleProfile(slug);
    if (!profile) return res.status(404).json({ error: 'Temple not found.' });

    if (profile.is_preview !== true) {
      return res.status(403).json({ error: 'Only preview sites can be cleared.' });
    }

    if (shouldUseSupabase()) {
      try {
        await supabase.from('temple_profiles').delete().eq('slug', slug);
        await supabase.from('registered_temples').delete().eq('slug', slug);
      } catch (err) {
        console.warn('[divyadarshan] Clear endpoint Supabase delete fell back to local:', err?.message || err);
      }
    }

    const store = await readLocalTempleStore();
    const nextRegistered = (store.registered_temples || []).filter((item) => item.slug !== slug);
    const nextProfiles = (store.temple_profiles || []).filter((item) => item.slug !== slug);
    await writeLocalTempleStore({ registered_temples: nextRegistered, temple_profiles: nextProfiles });

    res.json({ ok: true, message: 'Temple microsite cleared successfully.' });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unable to clear temple preview.' });
  }
});

app.post('/api/temple/login', async (req, res) => {
  if (!requireTempleJwt(res)) return;

  const slug = slugify(req.body?.slug);
  const password = String(req.body?.password || '');
  const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';

  if (!slug || !password) return res.status(400).json({ error: 'Slug and password are required.' });

  const profile = await fetchTempleProfile(slug);
  if (!profile) return res.status(404).json({ error: 'Temple admin account not found.' });
  if (String(profile?.status || 'active').toLowerCase() !== 'active') {
    return res.status(403).json({
      error: 'TemplePendingApproval',
      status: profile?.status || 'pending',
      message: 'Temple admin access will be enabled after the main admin approves this temple.',
    });
  }
  if (email && profile.admin_email !== email) {
    return res.status(401).json({ error: 'Email does not match this temple account.' });
  }

  const ok = await bcrypt.compare(password, profile.admin_password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    {
      sub: slug,
      role: 'temple_admin',
      email: profile.admin_email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    slug,
    temple_name: profile.temple_name,
    admin_email: profile.admin_email,
    admin_url: `${buildTempleMicrositeUrl(req, slug)}/admin`,
  });
});

app.get('/api/temples', async (req, res) => {
  try {
    res.json({ temples: await listPublishedTempleProfiles() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temples/map', async (req, res) => {
  try {
    const published = await listPublishedTempleProfiles();

    res.json({
      temples: published.map((row) => ({
        slug: row.slug,
        name: row.temple_name,
        city: row.city,
        state: row.state,
        religion: row.religion,
        deity: row.deity_name,
        latitude: row.latitude,
        longitude: row.longitude,
        hero_image_url: row.hero_image_url,
        primary_color: row.primary_color,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temples/:slug', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    res.json(stripTempleSecrets({ ...profile, theme_vars: buildTempleThemeCssVars(profile) }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temples/:slug/slots', async (req, res) => {
  try {
    const state = await bookingControl.getState();
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    const slots = await buildTempleSlotsWithAvailability(profile, req.query?.date);
    res.json({
      bookingPaused: Boolean(state.paused),
      reason: state.reason || '',
      resumeAt: state.resumeAt || null,
      templeSlug: req.params.slug,
      slots,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/temple-registrations', bookingControl.adminAuth, async (req, res) => {
  const statusFilter = req.query?.status ? String(req.query.status).trim().toLowerCase() : '';
  try {
    const map = new Map();

    if (shouldUseSupabase()) {
      try {
        let registryQuery = supabase
          .from('registered_temples')
          .select('slug, status, created_at, updated_at')
          .order('created_at', { ascending: false });
        if (statusFilter) registryQuery = registryQuery.eq('status', statusFilter);

        const { data: registryRows, error: registryError } = await registryQuery;
        if (registryError) throw registryError;

        const slugs = (registryRows || []).map((row) => row.slug).filter(Boolean);
        if (slugs.length) {
          const { data: profiles, error: profileError } = await supabase
            .from('temple_profiles')
            .select('slug, temple_name, deity_name, religion, city, state, admin_email, admin_phone, admin_id_verification')
            .in('slug', slugs);
          if (profileError) throw profileError;

          const profileMap = new Map((profiles || []).map((profile) => [profile.slug, profile]));
          for (const row of registryRows || []) {
            map.set(row.slug, {
              slug: row.slug,
              status: row.status,
              created_at: row.created_at,
              updated_at: row.updated_at,
              ...(profileMap.get(row.slug) || {}),
            });
          }
        }
      } catch (error) {
        console.warn('[divyadarshan] admin temple queue fell back to local store:', error?.message || error);
      }
    }

    const localProfiles = await listLocalTempleProfiles(statusFilter);
    for (const profile of localProfiles) {
      if (map.has(profile.slug)) continue;
      map.set(profile.slug, {
        slug: profile.slug,
        status: profile.status,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        temple_name: profile.temple_name,
        deity_name: profile.deity_name,
        religion: profile.religion,
        city: profile.city,
        state: profile.state,
        admin_email: profile.admin_email,
        admin_phone: profile.admin_phone,
        admin_id_verification: profile.admin_id_verification || null,
      });
    }

    res.json({ temples: Array.from(map.values()).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/temple-registrations/:slug/status', bookingControl.adminAuth, async (req, res) => {
  const slug = slugify(req.params.slug);
  const nextStatus = String(req.body?.status || '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ error: 'Temple slug is required.' });
  if (!['pending', 'active', 'suspended'].includes(nextStatus)) {
    return res.status(400).json({ error: 'Status must be pending, active, or suspended.' });
  }

  try {
    let remoteRecord = null;
    if (shouldUseSupabase()) {
      try {
        const { data, error } = await supabase
          .from('registered_temples')
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq('slug', slug)
          .select('slug, status, created_at, updated_at')
          .single();
        if (error) throw error;
        remoteRecord = data;
      } catch (error) {
        console.warn('[divyadarshan] temple status update fell back to local store:', error?.message || error);
      }
    }

    const localRecord = await updateLocalTempleRegistrationStatus(slug, nextStatus);
    if (!remoteRecord && !localRecord) return res.status(404).json({ error: 'Temple registration not found.' });

    res.json({ ok: true, temple: remoteRecord || localRecord });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/temple-registrations/:slug', bookingControl.adminAuth, async (req, res) => {
  const slug = slugify(req.params.slug);
  if (!slug) return res.status(400).json({ error: 'Temple slug is required.' });

  try {
    let deletedFromRemote = false;
    if (shouldUseSupabase()) {
      try {
        const { error: profileError } = await supabase
          .from('temple_profiles')
          .delete()
          .eq('slug', slug);
        if (profileError) throw profileError;

        const { error: registryError } = await supabase
          .from('registered_temples')
          .delete()
          .eq('slug', slug);
        if (registryError) throw registryError;

        deletedFromRemote = true;
      } catch (error) {
        console.warn('[divyadarshan] admin temple delete fell back to local store:', error?.message || error);
      }
    }

    const deletedFromLocal = await deleteLocalTempleRegistration(slug);

    if (!deletedFromRemote && !deletedFromLocal) {
      return res.status(404).json({ error: 'Temple registration not found.' });
    }

    res.json({ ok: true, deleted: slug });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple/:slug', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    res.json(stripTempleSecrets({ ...profile, theme_vars: buildTempleThemeCssVars(profile) }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple/:slug/timings', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    res.json({
      slug: req.params.slug,
      temple_name: profile.temple_name,
      darshan_timings: profile.darshan_timings || [],
      special_days: profile.special_days || [],
      closed_days: profile.closed_days || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple/:slug/sevas', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    res.json({ slug: req.params.slug, sevas: profile.sevas || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple/:slug/prasadam', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    res.json({
      slug: req.params.slug,
      prasadam_counter_open: toBoolean(profile.prasadam_counter_open, true),
      prasadam_online_order: toBoolean(profile.prasadam_online_order, false),
      prasadam_items: profile.prasadam_items || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple/:slug/events', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    const events = [...(profile.events || [])].sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')));
    res.json({ slug: req.params.slug, events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple/:slug/qr-scan', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    let total = Number(profile.total_scans || 0) + 1;
    if (shouldUseSupabase()) {
      try {
        total = await trackTempleQrScan(req, req.params.slug);
      } catch (error) {
        console.warn('[divyadarshan] QR tracking fell back to local activity store:', error?.message || error);
        await appendLocalTempleActivity('qr_scans', {
          id: `SCAN-${Date.now().toString(36).toUpperCase()}`,
          temple_slug: req.params.slug,
          scanned_at: new Date().toISOString(),
          user_agent: req.get('user-agent') || null,
          ip_hash: crypto.createHash('sha256').update(getClientIp(req)).digest('hex'),
        });
        const updated = await updateLocalTempleProfile(req.params.slug, { total_scans: total });
        total = Number(updated?.total_scans || total);
      }
    } else {
      await appendLocalTempleActivity('qr_scans', {
        id: `SCAN-${Date.now().toString(36).toUpperCase()}`,
        temple_slug: req.params.slug,
        scanned_at: new Date().toISOString(),
        user_agent: req.get('user-agent') || null,
        ip_hash: crypto.createHash('sha256').update(getClientIp(req)).digest('hex'),
      });
      const updated = await updateLocalTempleProfile(req.params.slug, { total_scans: total });
      total = Number(updated?.total_scans || total);
    }
    res.json({ ok: true, slug: req.params.slug, temple_name: profile.temple_name, total_scans: total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple/:slug/admin/summary', templeAuth, async (req, res) => {
  try {
    const profile = await fetchTempleProfile(req.params.slug);
    if (!profile) return res.status(404).json({ error: 'Temple not found.' });

    let bookings = [];
    let donations = [];
    let scans = [];
    if (shouldUseSupabase()) {
      try {
        const [bookingsResp, donationsResp, scansResp] = await Promise.all([
          supabase.from('bookings').select('*').eq('temple_slug', req.params.slug).order('created_at', { ascending: false }),
          supabase.from('temple_donations').select('*').eq('temple_slug', req.params.slug).order('created_at', { ascending: false }),
          supabase.from('qr_scans').select('*').eq('temple_slug', req.params.slug).order('scanned_at', { ascending: false }),
        ]);
        if (bookingsResp.error) throw bookingsResp.error;
        if (donationsResp.error) throw donationsResp.error;
        if (scansResp.error) throw scansResp.error;
        bookings = bookingsResp.data || [];
        donations = donationsResp.data || [];
        scans = scansResp.data || [];
      } catch (error) {
        console.warn('[divyadarshan] temple admin summary fell back to local activity store:', error?.message || error);
      }
    }
    if (!bookings.length) bookings = await listLocalTempleActivity(req.params.slug, 'bookings');
    if (!donations.length) donations = await listLocalTempleActivity(req.params.slug, 'donations');
    if (!scans.length) scans = await listLocalTempleActivity(req.params.slug, 'qr_scans');

    res.json(buildTempleAdminSummary(profile, bookings, donations, scans));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/temple/:slug/admin/profile', templeAuth, async (req, res) => {
  try {
    const updates = sanitizeTempleProfilePayload(req.body || {});
    if (req.body?.admin_password) {
      updates.admin_password_hash = await bcrypt.hash(String(req.body.admin_password), 12);
    }

    const hydratedUpdates = await hydrateTempleAssetFields(req.params.slug, updates);
    if (!Object.keys(hydratedUpdates).length) {
      return res.status(400).json({ error: 'No valid temple profile fields were provided.' });
    }

    if (shouldUseSupabase()) {
      try {
        const { data, error } = await supabase
          .from('temple_profiles')
          .update(hydratedUpdates)
          .eq('slug', req.params.slug)
          .select('*')
          .single();

        if (error) throw error;
        await touchTempleUpdatedAt(req.params.slug);
        return res.json(stripTempleSecrets(data));
      } catch (error) {
        console.warn('[divyadarshan] temple profile update fell back to local store:', error?.message || error);
      }
    }

    const data = await updateLocalTempleProfile(req.params.slug, hydratedUpdates);
    if (!data) return res.status(404).json({ error: 'Temple not found.' });
    res.json(stripTempleSecrets(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/temple/:slug/admin/sevas', templeAuth, async (req, res) => {
  try {
    const profile = await fetchTempleProfile(req.params.slug);
    if (!profile) return res.status(404).json({ error: 'Temple not found.' });

    const nextSevas = Array.isArray(req.body?.sevas)
      ? req.body.sevas
      : upsertArrayItem(profile.sevas || [], req.body?.seva || req.body || {}, ['id', 'name']);

    if (shouldUseSupabase()) {
      try {
        const { data, error } = await supabase
          .from('temple_profiles')
          .update({ sevas: nextSevas })
          .eq('slug', req.params.slug)
          .select('slug, sevas')
          .single();

        if (error) throw error;
        await touchTempleUpdatedAt(req.params.slug);
        return res.json(data);
      } catch (error) {
        console.warn('[divyadarshan] temple sevas update fell back to local store:', error?.message || error);
      }
    }

    const data = await updateLocalTempleProfile(req.params.slug, { sevas: nextSevas });
    res.json({ slug: req.params.slug, sevas: data?.sevas || nextSevas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/temple/:slug/admin/events', templeAuth, async (req, res) => {
  try {
    const profile = await fetchTempleProfile(req.params.slug);
    if (!profile) return res.status(404).json({ error: 'Temple not found.' });

    const nextEvents = Array.isArray(req.body?.events)
      ? req.body.events
      : upsertArrayItem(profile.events || [], req.body?.event || req.body || {}, ['id', 'title']);

    if (shouldUseSupabase()) {
      try {
        const { data, error } = await supabase
          .from('temple_profiles')
          .update({ events: nextEvents })
          .eq('slug', req.params.slug)
          .select('slug, events')
          .single();

        if (error) throw error;
        await touchTempleUpdatedAt(req.params.slug);
        return res.json(data);
      } catch (error) {
        console.warn('[divyadarshan] temple events update fell back to local store:', error?.message || error);
      }
    }

    const data = await updateLocalTempleProfile(req.params.slug, { events: nextEvents });
    res.json({ slug: req.params.slug, events: data?.events || nextEvents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple/:slug/admin/bookings', templeAuth, async (req, res) => {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('temple_slug', req.params.slug)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ bookings: data || [] });
    } catch (error) {
      console.warn('[divyadarshan] temple bookings list fell back to local activity store:', error?.message || error);
    }
  }
  res.json({ bookings: await listLocalTempleActivity(req.params.slug, 'bookings') });
});

app.get('/api/temple/:slug/admin/donations', templeAuth, async (req, res) => {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('temple_donations')
        .select('*')
        .eq('temple_slug', req.params.slug)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ donations: data || [] });
    } catch (error) {
      console.warn('[divyadarshan] temple donations list fell back to local activity store:', error?.message || error);
    }
  }
  res.json({ donations: await listLocalTempleActivity(req.params.slug, 'donations') });
});

app.get('/api/temple/:slug/admin/orders', templeAuth, async (req, res) => {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabase
        .from('prasadam_orders')
        .select('*')
        .eq('temple_slug', req.params.slug)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ orders: data || [] });
    } catch (error) {
      console.warn('[divyadarshan] temple orders list fell back to local activity store:', error?.message || error);
    }
  }
  res.json({ orders: await listLocalTempleActivity(req.params.slug, 'orders') });
});

app.post('/api/temple/:slug/bookings', async (req, res) => {
  try {
    const bookingGate = await ensureBookingAvailable(res);
    if (bookingGate.blocked) return;
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });
    if (profile.booking_enabled === false) {
      return res.status(503).json({ error: 'BookingDisabled', reason: 'This temple has not enabled slot booking yet.' });
    }

    const qty = Number(req.body?.qty || 0);
    if (!qty || qty < 1) return res.status(400).json({ error: 'Booking quantity must be at least 1.' });

    const selectedDate = req.body?.visit_date || null;
    const selectedSlot = String(req.body?.slot || '').trim();
    const availableSlots = await buildTempleSlotsWithAvailability(profile, selectedDate);
    const matchedSlot = availableSlots.find((slot) => slot.key === selectedSlot || buildTempleSlotKey(slot) === selectedSlot);
    if (!matchedSlot) {
      return res.status(400).json({ error: 'Selected slot is not available for this date.' });
    }
    if (qty > Number(matchedSlot.available || 0)) {
      return res.status(409).json({ error: 'This slot just filled up. Please select another slot.' });
    }

    const ticketType = String(req.body?.ticket_type || 'General');
    const unitAmount = getTempleBookingPrice(profile, ticketType);
    const totalAmount = unitAmount * qty;
    const bookingPayload = {
      id: req.body?.id || buildTempleTicketId(req.params.slug),
      temple_key: req.params.slug,
      temple_slug: req.params.slug,
      temple_name: profile.temple_name,
      visit_date: selectedDate,
      slot: matchedSlot.key,
      qty,
      phone: req.body?.phone || null,
      ticket_type: ticketType,
      source: req.body?.source || 'Temple Microsite',
      status: req.body?.status || 'Pending',
      created_at: new Date().toISOString(),
    };

    let data = null;
    if (shouldUseSupabase()) {
      try {
        const response = await supabase.from('bookings').insert(bookingPayload).select('*').single();
        if (response.error) throw response.error;
        data = response.data;
      } catch (error) {
        console.warn('[divyadarshan] temple booking insert fell back to local activity store:', error?.message || error);
      }
    }
    if (!data) {
      data = await appendLocalTempleActivity('bookings', bookingPayload);
    }
    broadcastBookingEvent('created', data);

    if (shouldUseSupabase() && data !== bookingPayload) {
      try {
        await supabase
          .from('temple_profiles')
          .update({ total_bookings: Number(profile.total_bookings || 0) + qty })
          .eq('slug', req.params.slug);
        await touchTempleUpdatedAt(req.params.slug);
      } catch (error) {
        console.warn('[divyadarshan] temple booking counter update fell back to local store:', error?.message || error);
        await updateLocalTempleProfile(req.params.slug, { total_bookings: Number(profile.total_bookings || 0) + qty });
      }
    } else {
      await updateLocalTempleProfile(req.params.slug, { total_bookings: Number(profile.total_bookings || 0) + qty });
    }

    if (bookingPayload.phone) {
      const to = normalizeTwilioTo(bookingPayload.phone);
      if (to) {
        twilioSendMessage({
          to,
          body: buildTempleBookingConfirmationText({ ...bookingPayload, total_amount: totalAmount }, profile),
        }).catch((sendError) => console.warn('[divyadarshan] Temple booking message failed:', sendError?.message || sendError));
      }
    }

    res.status(201).json({
      ...data,
      temple_address: [profile.address_line1, profile.address_line2, profile.city, profile.state, profile.pincode]
        .filter(Boolean)
        .join(', '),
      unit_amount: unitAmount,
      total_amount: totalAmount,
      qr_code_url: buildQrCodeUrl(`ticket:${data.id}`),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/booking/create', async (req, res) => {
  return createMacroBooking(req, res);
});

app.post('/api/temple/:slug/prasadam/order', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });

    const catalog = new Map((profile.prasadam_items || []).map((item) => [String(item.name || '').toLowerCase(), item]));
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'At least one prasadam item is required.' });

    const normalizedItems = items.map((item) => {
      const qty = Math.max(1, Number(item.qty || 1));
      const catalogItem = catalog.get(String(item.name || '').toLowerCase());
      const price = Number(item.price ?? catalogItem?.price ?? 0);
      return {
        name: item.name,
        qty,
        price,
        unit: item.unit || catalogItem?.unit || null,
      };
    });

    const total = normalizedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    const orderPayload = {
        id: req.body?.id || `PRAS-${Date.now().toString(36).toUpperCase()}`,
        temple_slug: req.params.slug,
        items: normalizedItems,
        total,
        phone: req.body?.phone || null,
        pickup_slot: req.body?.pickup_slot || null,
        status: req.body?.status || 'pending',
        created_at: new Date().toISOString(),
      };
    let data = null;
    if (shouldUseSupabase()) {
      try {
        const response = await supabase
          .from('prasadam_orders')
          .insert(orderPayload)
          .select('*')
          .single();
        if (response.error) throw response.error;
        data = response.data;
        await touchTempleUpdatedAt(req.params.slug);
      } catch (error) {
        console.warn('[divyadarshan] prasadam order fell back to local activity store:', error?.message || error);
      }
    }
    if (!data) data = await appendLocalTempleActivity('orders', orderPayload);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/temple/:slug/donation', async (req, res) => {
  try {
    const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
    if (!profile) return res.status(statusCode).json({ error: accessError || 'Temple not found.' });
    if (accessError) return res.status(statusCode).json({ error: 'TemplePendingApproval', status: profile.status, message: accessError });

    const amount = Number(req.body?.amount || 0);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Donation amount must be greater than zero.' });

    const cause = req.body?.cause || null;
    const donationPayload = {
        id: req.body?.id || `DON-${Date.now().toString(36).toUpperCase()}`,
        temple_slug: req.params.slug,
        donor_name: req.body?.donor_name || null,
        amount,
        cause,
        payment_ref: req.body?.payment_ref || null,
        created_at: new Date().toISOString(),
      };
    let data = null;
    if (shouldUseSupabase()) {
      try {
        const response = await supabase
          .from('temple_donations')
          .insert(donationPayload)
          .select('*')
          .single();
        if (response.error) throw response.error;
        data = response.data;
      } catch (error) {
        console.warn('[divyadarshan] temple donation fell back to local activity store:', error?.message || error);
      }
    }
    if (!data) data = await appendLocalTempleActivity('donations', donationPayload);

    const updatedCauses = Array.isArray(profile.donation_causes)
      ? profile.donation_causes.map((item) =>
          item?.name === cause ? { ...item, raised: Number(item.raised || 0) + amount } : item
        )
      : [];

    if (shouldUseSupabase() && data !== donationPayload) {
      try {
        await supabase
          .from('temple_profiles')
          .update({
            total_donations: Number(profile.total_donations || 0) + amount,
            donation_causes: updatedCauses,
          })
          .eq('slug', req.params.slug);
        await touchTempleUpdatedAt(req.params.slug);
      } catch (error) {
        console.warn('[divyadarshan] temple donation counter update fell back to local store:', error?.message || error);
        await updateLocalTempleProfile(req.params.slug, {
          total_donations: Number(profile.total_donations || 0) + amount,
          donation_causes: updatedCauses,
        });
      }
    } else {
      await updateLocalTempleProfile(req.params.slug, {
        total_donations: Number(profile.total_donations || 0) + amount,
        donation_causes: updatedCauses,
      });
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/temple-page/:slug', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const { slug } = req.params;
  const { data, error } = await supabase
    .from('temple_pages')
    .select('slug, source_url, title, content_html, updated_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// Table: bookings(
//   id text primary key,
//   temple_key text not null,
//   temple_name text not null,
//   visit_date text,
//   slot text,
//   qty int4 not null,
//   phone text,
//   ticket_type text,
//   source text,
//   status text,
//   created_at timestamptz default now()
// )
app.get('/api/bookings', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const { temple_key, temple_slug, limit } = req.query;
  let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (temple_key) query = query.eq('temple_key', temple_key);
  if (temple_slug) query = query.eq('temple_slug', temple_slug);
  const normalizedLimit = Number(limit || 0);
  if (normalizedLimit > 0) query = query.limit(Math.min(normalizedLimit, 200));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bookings: data || [] });
});

app.post('/api/bookings', createMacroBooking);

app.patch('/api/bookings/:id', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const { id } = req.params;
  const updates = {};
  for (const key of ['status', 'slot', 'visit_date', 'qty', 'phone']) {
    if (req.body && req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  broadcastBookingEvent('updated', data);
  res.json(data);
});

app.delete('/api/bookings/:id', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const { id } = req.params;
  const { data: existing } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  if (existing?.ticket_inventory_id && Number(existing.qty || 0) > 0) {
    try {
      const restored = await releaseTicketInventory(existing.ticket_inventory_id, Number(existing.qty || 0));
      broadcastTicketEvent('restored', restored);
    } catch (restoreError) {
      console.warn('[divyadarshan] unable to restore ticket seats on booking delete:', restoreError?.message || restoreError);
    }
  }
  broadcastBookingEvent('deleted', existing || { id });
  res.json({ ok: true });
});

app.get('/api/admin/summary', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const { temple_key } = req.query;
  let query = supabase.from('bookings').select('*');
  if (temple_key) query = query.eq('temple_key', temple_key);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const bookings = data || [];
  const summary = {
    totalBookings: bookings.length,
    confirmed: bookings.filter((b) => b.status === 'Confirmed').length,
    pending: bookings.filter((b) => b.status !== 'Confirmed').length,
    online: bookings.filter((b) => (b.source || '').toLowerCase() === 'online').length,
    offline: bookings.filter((b) => (b.source || '').toLowerCase() === 'offline').length,
  };
  res.json(summary);
});

// Real-data Travel Planner (OSM + scraped temple page + Gemini)
app.post('/api/travel/plan', async (req, res) => {
  if (!requireSupabase(req, res)) return;

  const {
    templeKey,
    templeName,
    date,
    timeOfDay,
    pilgrims,
    budget,
    nights,
    origin,
    extraStops,
    special,
  } = req.body || {};

  if (!templeKey || !templeName) return res.status(400).json({ error: 'Missing templeKey/templeName' });

  try {
    // 1) Get scraped temple info (if available)
    const { data: page } = await supabase
      .from('temple_pages')
      .select('source_url, title, content_html, updated_at')
      .eq('slug', templeKey)
      .maybeSingle();

    const templeText = page?.content_html
      ? cheerio.load(page.content_html).text().replace(/\s+/g, ' ').trim().slice(0, 4000)
      : '';

    // 2) Geocode & pull nearby POIs/hotels (prefer Google when configured, fallback to OSM on Google denial)
    let geo = null;
    let googleWarning = null;
    let routeInfo = null;
    let googleHotels = [];
    let googlePlaces = [];

    if (GOOGLE_API_KEY) {
      try {
        geo = await googleGeocode(`${templeName} temple`);
      } catch (e) {
        const msg = String(e?.message || '');
        // Common causes: API not enabled, billing disabled, key restrictions, wrong key.
        googleWarning =
          `Google Geocoding unavailable: ${msg}. ` +
          `Fix in Google Cloud: enable “Geocoding API”, enable billing, and ensure this key allows Geocoding + Places + Directions (and correct referrer/IP restrictions).`;
        geo = await geocodePlace(`${templeName} temple`);
      }
    } else {
      geo = await geocodePlace(`${templeName} temple`);
    }
    if (!geo) return res.status(404).json({ error: 'Could not locate temple on map' });

    let elements = [];
    let osmWarning = null;

    if (GOOGLE_API_KEY) {
      try {
        const [hotels, places] = await Promise.all([
          googleNearby({ lat: geo.lat, lon: geo.lon, radius: 3500, type: 'lodging', keyword: 'hotel' }),
          googleNearby({ lat: geo.lat, lon: geo.lon, radius: 3500, type: 'tourist_attraction', keyword: '' }),
        ]);
        googleHotels = hotels;
        googlePlaces = places;
      } catch (e) {
        googleWarning = (googleWarning ? googleWarning + ' | ' : '') + `Google Places unavailable: ${e?.message || 'unknown error'}`;
      }

      const originText = typeof origin === 'string' ? origin.trim() : '';
      if (originText) {
        try {
          routeInfo = await googleDirections({ origin: originText, destLat: geo.lat, destLon: geo.lon });
        } catch (e) {
          googleWarning = (googleWarning ? googleWarning + ' | ' : '') + `Google Directions unavailable: ${e?.message || 'unknown error'}`;
        }
      }
    } else {
    try {
      // Hard cap OSM lookup time so planner stays fast.
      elements = await Promise.race([
        overpassNearby(geo.lat, geo.lon, 3500),
        new Promise((_, rej) => setTimeout(() => rej(new Error('OSM lookup timeout')), 8000)),
      ]);
    } catch (e) {
      osmWarning = `OSM nearby lookup unavailable: ${e?.message || 'unknown error'}`;
      elements = [];
    }
    }

    const hotels = [];
    const pois = [];
    if (GOOGLE_API_KEY && (googleHotels.length || googlePlaces.length)) {
      for (const h of googleHotels) {
        hotels.push({
          name: h.name,
          lat: h.geometry?.location?.lat ?? null,
          lon: h.geometry?.location?.lng ?? null,
          type: 'hotel',
          address: h.vicinity || null,
          rating: h.rating ?? null,
          ratings_total: h.user_ratings_total ?? null,
          price_level: h.price_level ?? null,
          place_id: h.place_id ?? null,
          photo_ref: h.photos?.[0]?.photo_reference ?? null,
        });
      }
      for (const p of googlePlaces) {
        pois.push({
          name: p.name,
          lat: p.geometry?.location?.lat ?? null,
          lon: p.geometry?.location?.lng ?? null,
          type: (p.types && p.types[0]) ? p.types[0] : 'place',
          address: p.vicinity || null,
          rating: p.rating ?? null,
          ratings_total: p.user_ratings_total ?? null,
          place_id: p.place_id ?? null,
          photo_ref: p.photos?.[0]?.photo_reference ?? null,
        });
      }
    } else {
      for (const el of elements) {
        const tags = el.tags || {};
        const name = tags.name;
        if (!name) continue;
        const item = {
          name,
          lat: el.lat,
          lon: el.lon,
          type: tags.amenity || tags.tourism || 'place',
          address: [
            tags['addr:housenumber'],
            tags['addr:street'],
            tags['addr:suburb'],
            tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
            tags['addr:postcode'],
          ]
            .filter(Boolean)
            .join(', '),
          stars: tags.stars || null, // official star rating (not review rating)
          phone: tags.phone || tags['contact:phone'] || null,
          website: tags.website || tags['contact:website'] || null,
        };
        if (tags.amenity && ['hotel', 'guest_house', 'hostel'].includes(tags.amenity)) hotels.push(item);
        else pois.push(item);
      }
    }

    // 3) Ask Gemini to build a grounded itinerary (no hallucinated ratings/photos)
    const prompt = `
You are a travel planner. Use ONLY the provided real data. Do NOT invent hotel ratings, prices, or photos.

User inputs:
- Temple: ${templeName} (${templeKey})
- Date: ${date || 'not provided'}
- Time of day: ${timeOfDay || 'not provided'}
- Pilgrims: ${pilgrims || 'not provided'}
- Budget: ${budget || 'not provided'}
- Nights: ${nights || 'not provided'}
- Origin: ${origin || 'not provided'}
- Extra stops requested: ${Array.isArray(extraStops) ? extraStops.join(', ') : 'none'}
- Special needs: ${special ? JSON.stringify(special) : 'none'}

Temple info (scraped text, if available):
SOURCE: ${page?.source_url || 'none'}
TEXT: ${templeText || 'none'}

Nearby hotels from OpenStreetMap (no ratings/photos available):
${hotels.slice(0, 12).map((h, i) => `${i + 1}. ${h.name} (${h.type}) @ ${h.lat},${h.lon} ${h.address ? '- ' + h.address : ''}`).join('\n')}

Nearby places/POIs from OpenStreetMap:
${pois.slice(0, 12).map((p, i) => `${i + 1}. ${p.name} (${p.type}) @ ${p.lat},${p.lon} ${p.address ? '- ' + p.address : ''}`).join('\n')}

Return STRICT JSON only, with this shape:
{
  "summary": string,
  "templeFacts": string[],
  "recommendedHotels": [{ "name": string, "type": string, "lat": number, "lon": number, "mapsUrl": string }],
  "recommendedStops": [{ "name": string, "type": string, "lat": number, "lon": number, "mapsUrl": string }],
  "itinerary": [{ "time": string, "activity": string, "reason": string }]
}
Make the plan realistic with buffers. If you lack data, say so clearly.`;

    let plan = null;
    let aiWarning = null;
    try {
      // Groq first (fast), Gemini fallback
      try {
        plan = await groqGenerateJson(prompt);
      } catch (e) {
        plan = await geminiGenerateJson(prompt);
      }
    } catch (e) {
      aiWarning = `AI unavailable: ${e?.message || 'unknown error'}`;
      plan = null;
    }

    // Sanitize + add maps URL. (Prevents AI from inventing ratings/photos.)
    const addMapsUrl = (x) => {
      const name = x?.name ? String(x.name) : '';
      const type = x?.type ? String(x.type) : 'place';
      const lat = typeof x?.lat === 'number' ? x.lat : null;
      const lon = typeof x?.lon === 'number' ? x.lon : null;
      const mapsUrl =
        x?.mapsUrl ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${templeName}`)}`;
      const out = { name, type, lat, lon, mapsUrl };
      // carry through safe real fields if present
      for (const k of ['address','phone','website','stars','rating','ratings_total','price_level','place_id','photo_ref','distance_km']) {
        if (x && x[k] !== undefined) out[k] = x[k];
      }
      if (out.photo_ref && GOOGLE_API_KEY) {
        out.photoUrl = `/api/google/photo?ref=${encodeURIComponent(out.photo_ref)}&maxwidth=600`;
      }
      return out;
    };

    // Non-AI fallback: return real data we have, with a simple templated itinerary.
    if (!plan) {
      const templeFacts = [];
      if (templeText) {
        // Pull a few timing-like sentences (very conservative)
        const candidates = templeText
          .split(/(?<=[.?!])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const s of candidates) {
          if (/\b(AM|PM|a\.m\.|p\.m\.)\b/i.test(s) || /\b\d{1,2}:\d{2}\b/.test(s)) {
            templeFacts.push(s);
          }
          if (templeFacts.length >= 4) break;
        }
      }

      const t = timeOfDay || 'morning';
      const itinerary = [
        { time: 'T‑60 min', activity: `Arrive near ${templeName} and park/check-in`, reason: 'Buffer for traffic + queues' },
        { time: 'T‑45 min', activity: 'Freshen up, follow dress code, keep ID ready', reason: 'Smooth entry and fewer delays' },
        { time: t === 'morning' ? '06:00–09:00' : t === 'afternoon' ? '12:00–15:00' : '17:00–20:00', activity: 'Darshan window', reason: 'Based on selected time-of-day' },
        { time: 'After darshan', activity: 'Prasadam / Annadana (if available)', reason: 'Temple service (check source)' },
        { time: 'Later', activity: extraStops && extraStops.length ? `Optional stops: ${extraStops.join(', ')}` : 'Optional nearby sightseeing', reason: 'Only if time permits' },
      ];

      const recHotels = hotels.slice(0, 6).map((h) => {
        const base = addMapsUrl({ name: h.name, type: h.type, lat: h.lat, lon: h.lon });
        base.address = h.address || null;
        base.phone = h.phone || null;
        base.website = h.website || null;
        base.stars = h.stars || null;
        base.distance_km = (base.lat && base.lon) ? Number(haversineKm({ lat: geo.lat, lon: geo.lon }, { lat: base.lat, lon: base.lon }).toFixed(2)) : null;
        return base;
      });
      const recStops = pois.slice(0, 10).map((p) => {
        const base = addMapsUrl({ name: p.name, type: p.type, lat: p.lat, lon: p.lon });
        base.address = p.address || null;
        base.distance_km = (base.lat && base.lon) ? Number(haversineKm({ lat: geo.lat, lon: geo.lon }, { lat: base.lat, lon: base.lon }).toFixed(2)) : null;
        return base;
      });
      // Attach photos if available (real thumbnails, may be null)
      for (const h of recHotels) h.photoUrl = await wikiThumbnailForName(h.name);
      for (const s of recStops) s.photoUrl = await wikiThumbnailForName(s.name);

      return res.json({
        geo,
        sourceUrl: page?.source_url || null,
        osmWarning,
        aiWarning,
        summary: `Real-data plan for ${templeName}. (AI generation is currently unavailable.)`,
        templeFacts,
        recommendedHotels: recHotels,
        recommendedStops: recStops,
        itinerary,
      });
    }

    const respBody = {
      geo,
      sourceUrl: page?.source_url || null,
      osmWarning,
      googleWarning,
      routeInfo,
      aiWarning,
      ...plan,
      recommendedHotels: Array.isArray(plan.recommendedHotels) ? plan.recommendedHotels.map(addMapsUrl) : [],
      recommendedStops: Array.isArray(plan.recommendedStops) ? plan.recommendedStops.map(addMapsUrl) : [],
    };

    // Attach real photos if possible (no ratings)
    for (const h of respBody.recommendedHotels) h.photoUrl = await wikiThumbnailForName(h.name);
    for (const s of respBody.recommendedStops) s.photoUrl = await wikiThumbnailForName(s.name);

    // Enrich with OSM fields when we can match by name
    const byName = (arr) => {
      const map = new Map();
      for (const x of arr) {
        const k = String(x.name || '').trim().toLowerCase();
        if (k) map.set(k, x);
      }
      return map;
    };
    const hotelMap = byName(hotels);
    const poiMap = byName(pois);
    for (const h of respBody.recommendedHotels) {
      const m = hotelMap.get(String(h.name || '').trim().toLowerCase());
      if (m) {
        h.address = m.address || null;
        h.phone = m.phone || null;
        h.website = m.website || null;
        h.stars = m.stars || null;
        h.distance_km = (h.lat && h.lon) ? Number(haversineKm({ lat: geo.lat, lon: geo.lon }, { lat: h.lat, lon: h.lon }).toFixed(2)) : null;
      }
    }
    for (const s of respBody.recommendedStops) {
      const m = poiMap.get(String(s.name || '').trim().toLowerCase());
      if (m) {
        s.address = m.address || null;
        s.distance_km = (s.lat && s.lon) ? Number(haversineKm({ lat: geo.lat, lon: geo.lon }, { lat: s.lat, lon: s.lon }).toFixed(2)) : null;
      }
    }

    res.json(respBody);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Travel plan failed' });
  }
});

app.get('/temple/:slug/admin/login', async (req, res) => {
  if (shouldUseSupabase()) {
    try {
      const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
      if (!profile || accessError) {
        return res.status(accessError ? statusCode : 404).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple Admin Unavailable</h1><p>${accessError || 'Temple not found.'}</p><p>The temple admin page is only available for published temples.</p></body></html>`);
      }
    } catch (error) {
      return res.status(500).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple Admin Unavailable</h1><p>${error?.message || 'Unable to open temple admin right now.'}</p></body></html>`);
    }
  }

  res.sendFile(
    path.join(
      __dirname,
      'dashboard',
      'registration',
      'temple_admin_login.html'
    )
  );
});

app.get('/temple/:slug/admin', async (req, res) => {
  if (shouldUseSupabase()) {
    try {
      const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
      if (!profile || accessError) {
        return res.status(accessError ? statusCode : 404).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple Admin Unavailable</h1><p>${accessError || 'Temple not found.'}</p><p>The temple admin page is only available for published temples.</p></body></html>`);
      }
    } catch (error) {
      return res.status(500).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple Admin Unavailable</h1><p>${error?.message || 'Unable to open temple admin right now.'}</p></body></html>`);
    }
  }

  res.sendFile(
    path.join(
      __dirname,
      'dashboard',
      'registration',
      'temple_admin.html'
    )
  );
});

app.get('/temple/:slug/:page', async (req, res) => {
  const reserved = new Set(['admin', 'api']);
  if (reserved.has(String(req.params.page || '').toLowerCase())) return res.status(404).send('Not found');
  if (shouldUseSupabase()) {
    try {
      const { profile, error: accessError, statusCode } = await fetchTemplePublicProfile(req.params.slug);
      if (!profile) {
        return res.status(statusCode).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple not found</h1><p>${accessError || 'This temple could not be found.'}</p></body></html>`);
      }
      if (accessError) {
        return res.status(statusCode).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple Pending Approval</h1><p>${accessError}</p><p>Please return after the main admin approves this registration.</p></body></html>`);
      }
    } catch (error) {
      return res.status(500).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple unavailable</h1><p>${error?.message || 'Unable to load this temple right now.'}</p></body></html>`);
    }
  }

  res.sendFile(
    path.join(
      __dirname,
      'dashboard',
      'registration',
      'microsite_shell.html'
    )
  );
});

app.get('/temple/:slug', async (req, res) => {
  if (shouldUseSupabase()) {
    try {
      const tOut = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000));
      const { profile, error: accessError, statusCode } = await Promise.race([
        fetchTemplePublicProfile(req.params.slug),
        tOut,
      ]);
      if (!profile) {
        // Only block if we're sure the temple doesn't exist locally either
        const localProfile = await fetchLocalTempleProfile(req.params.slug).catch(() => null);
        if (!localProfile) {
          return res.status(statusCode).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple not found</h1><p>${accessError || 'This temple could not be found.'}</p><a href="/">Back to home</a></body></html>`);
        }
      } else if (accessError && statusCode === 403) {
        return res.status(statusCode).send(`<html><body style="font-family:Inter,sans-serif;padding:40px;background:#f6f7fb;color:#1f2937"><h1>Temple Pending Approval</h1><p>${accessError}</p><p>Please return after the main admin approves this registration.</p><a href="/">Back to home</a></body></html>`);
      }
    } catch (_err) {
      // Supabase unavailable or timed out — serve shell anyway, client will hydrate from local API
      console.warn('[divyadarshan] /temple/:slug Supabase check skipped, serving shell:', _err?.message);
    }
  }

  if (req.query?.via === 'qr' && supabase) {
    trackTempleQrScan(req, req.params.slug).catch((error) =>
      console.warn('[divyadarshan] QR tracking failed:', error?.message || error)
    );
  }

  res.sendFile(
    path.join(
      __dirname,
      'dashboard',
      'registration',
      'microsite_shell.html'
    )
  );
});


app.get('/booking/:id', async (req, res) => {
  try {
    let data = null;
    if (shouldUseSupabase()) {
      try {
        const response = await supabase.from('bookings').select('*').eq('id', req.params.id).maybeSingle();
        if (response.error) throw response.error;
        data = response.data;
      } catch (error) {
        console.warn('[divyadarshan] booking ticket lookup fell back to local activity store:', error?.message || error);
      }
    }
    if (!data) {
      const store = await readLocalTempleActivityStore();
      data = (store.bookings || []).find((booking) => booking.id === req.params.id) || null;
    }
    if (!data) {
      return res.status(404).send('<html><body style="font-family:Inter,sans-serif;padding:40px">Booking not found.</body></html>');
    }

    const profile = data.temple_slug ? await fetchTempleProfile(data.temple_slug).catch(() => null) : null;
    const address = profile
      ? [profile.address_line1, profile.address_line2, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')
      : data.temple_name || 'Temple';

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.temple_name || 'Temple'} Ticket ${data.id}</title>
  <style>
    body{font-family:Inter,system-ui,sans-serif;background:#f6f7fb;color:#1f2749;padding:24px}
    .ticket{max-width:760px;margin:0 auto;background:#fff;border-radius:28px;padding:32px;box-shadow:0 12px 32px rgba(26,35,126,0.08)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:20px}
    .card{background:#eef1fb;border-radius:20px;padding:16px}
    .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
    .btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:700}
    .btn-primary{background:#4c56af;color:#fff}
    .btn-soft{background:#eef1fb;color:#4c56af}
    img{max-width:180px;border-radius:20px;background:#fff;padding:8px}
  </style>
</head>
<body>
  <div class="ticket">
    <p style="text-transform:uppercase;letter-spacing:.18em;color:#4c56af;font-size:12px;font-weight:800">Temple Booking Ticket</p>
    <h1 style="margin:10px 0 0;font-size:34px">${data.temple_name || 'Temple Visit'}</h1>
    <p style="margin:10px 0 0;color:#66708f">${address}</p>
    <div class="grid">
      <div class="card"><strong>Booking Ref</strong><br/>${data.id}</div>
      <div class="card"><strong>Date</strong><br/>${data.visit_date || '-'}</div>
      <div class="card"><strong>Slot</strong><br/>${data.slot || '-'}</div>
      <div class="card"><strong>Visitors</strong><br/>${data.qty || 1}</div>
      <div class="card"><strong>Ticket Type</strong><br/>${data.ticket_type || '-'}</div>
      <div class="card"><strong>Status</strong><br/>${data.status || '-'}</div>
    </div>
    <div style="margin-top:24px">
      <img src="${buildQrCodeUrl(`ticket:${data.id}`)}" alt="Booking QR Code" />
    </div>
    <div class="actions">
      <button class="btn btn-primary" onclick="window.print()">Download Ticket</button>
      <a class="btn btn-soft" href="/dashboard/index.html">Back to Divya Darshan</a>
    </div>
  </div>
</body>
</html>`);
  } catch (error) {
    res.status(500).send(`<html><body style="font-family:Inter,sans-serif;padding:40px">Unable to load booking ticket: ${error?.message || 'Unknown error'}</body></html>`);
  }
});

// ==================== USER AUTHENTICATION & PROFILE APIS ====================
const USERS_FILE_PATH = path.join(__dirname, 'data', 'users.local.json');

async function readLocalUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeLocalUsers(users) {
  await fs.mkdir(path.dirname(USERS_FILE_PATH), { recursive: true });
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
}

// User Auth Middleware
function userAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    req.user = user;
    next();
  });
}

// User Register
app.post('/api/user/register', async (req, res) => {
  const { name, email, phone, password, city, chosen_religion } = req.body || {};
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'Missing name, email, phone, or password.' });
  }

  try {
    const users = await readLocalUsers();
    
    // Check if email or phone is already registered
    const existing = users.find(u => u.email === email || u.phone === phone);
    if (existing) {
      return res.status(400).json({ error: 'User with this email or phone already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const newUser = {
      id: 'usr_' + Date.now(),
      name,
      email,
      password_hash,
      phone,
      city: city || '',
      chosen_religion: chosen_religion || 'hindu',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      language: 'en',
      favourites: [],
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    await writeLocalUsers(users);

    // If Supabase is available, sync to Supabase user_profiles
    if (shouldUseSupabase()) {
      try {
        await supabase.from('user_profiles').upsert({
          phone: newUser.phone,
          name: newUser.name,
          city: newUser.city,
          created_at: newUser.created_at
        });
      } catch (err) {
        console.warn('[divyadarshan] failed to sync user to Supabase:', err.message);
      }
    }

    // Return safe user profile details (omit password hash)
    const { password_hash: _, ...safeUser } = newUser;
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Login
app.post('/api/user/login', async (req, res) => {
  const { identity, password } = req.body || {};
  if (!identity || !password) {
    return res.status(400).json({ error: 'Missing username (email/phone) or password.' });
  }

  try {
    const users = await readLocalUsers();
    const cleanIdentity = identity.trim();

    // Check if identity matches email or phone
    const user = users.find(u => u.email === cleanIdentity || u.phone === cleanIdentity || u.phone.replace(/\D/g, '').endsWith(cleanIdentity.replace(/\D/g, '')));
    if (!user) {
      return res.status(401).json({ error: 'Invalid identity or password.' });
    }

    const matched = await bcrypt.compare(password, user.password_hash);
    if (!matched) {
      return res.status(401).json({ error: 'Invalid identity or password.' });
    }

    const { password_hash: _, ...safeUser } = user;
    const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Profile
app.get('/api/user/profile', userAuth, async (req, res) => {
  try {
    const users = await readLocalUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { password_hash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Profile
app.put('/api/user/profile', userAuth, async (req, res) => {
  const { name, city, chosen_religion, language, profile_image } = req.body || {};
  try {
    const users = await readLocalUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found.' });

    const updated = {
      ...users[idx],
      name: name !== undefined ? name : users[idx].name,
      city: city !== undefined ? city : users[idx].city,
      chosen_religion: chosen_religion !== undefined ? chosen_religion : users[idx].chosen_religion,
      language: language !== undefined ? language : users[idx].language,
      profile_image: profile_image !== undefined ? profile_image : users[idx].profile_image,
      avatar_url: name !== undefined ? `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}` : users[idx].avatar_url,
    };

    users[idx] = updated;
    await writeLocalUsers(users);

    if (shouldUseSupabase()) {
      try {
        await supabase.from('user_profiles').upsert({
          phone: updated.phone,
          name: updated.name,
          city: updated.city
        });
      } catch (err) {
        console.warn('[divyadarshan] failed to update Supabase user profile:', err.message);
      }
    }

    const { password_hash: _, ...safeUser } = updated;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Bookings History
app.get('/api/user/bookings', userAuth, async (req, res) => {
  try {
    const activity = await readLocalTempleActivityStore();
    const phone = req.user.phone;
    const cleanPhoneDigits = phone.replace(/\D/g, '');

    // Get bookings matching the user's phone number
    const userBookings = (activity.bookings || []).filter(b => {
      if (!b.phone) return false;
      const bDigits = b.phone.replace(/\D/g, '');
      return bDigits.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(bDigits);
    });

    res.json(userBookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Donations History
app.get('/api/user/donations', userAuth, async (req, res) => {
  try {
    const activity = await readLocalTempleActivityStore();
    const phone = req.user.phone;
    const cleanPhoneDigits = phone.replace(/\D/g, '');

    const userDonations = (activity.donations || []).filter(d => {
      if (!d.phone) return false;
      const dDigits = d.phone.replace(/\D/g, '');
      return dDigits.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(dDigits);
    });

    res.json(userDonations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Travel Planner dedicated page
app.get('/travel-planner', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'travel-planner.html'));
});

// ==========================================
// EMAIL NOTIFICATION ENGINE & BACKGROUND CRON
// ==========================================

async function findUserEmailByPhone(phone) {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, '');
  try {
    const users = await readLocalUsers();
    const user = users.find(u => {
      const uPhone = String(u.phone || '').replace(/\D/g, '');
      return uPhone.endsWith(cleanPhone) || cleanPhone.endsWith(uPhone);
    });
    return user ? user.email : null;
  } catch (e) {
    console.warn('[divyadarshan] failed to look up user email by phone:', e.message);
    return null;
  }
}

async function sendEmail({ to, subject, html, text }) {
  console.log(`[divyadarshan] Sending Email to: ${to} | Subject: ${subject}`);
  
  let sentSuccessfully = false;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text,
        html
      });
      sentSuccessfully = true;
      console.log(`[divyadarshan] Real email sent successfully to ${to}`);
    } catch (err) {
      console.warn(`[divyadarshan] Real email sending failed, falling back to mock logger:`, err.message);
    }
  }
  
  // Local fallback: log to file logs/emails.log inside the workspace
  const logDir = path.join(__dirname, 'logs');
  const logPath = path.join(logDir, 'emails.log');
  await fs.mkdir(logDir, { recursive: true });
  
  const separator = '='.repeat(80);
  const emailLog = [
    separator,
    `TIMESTAMP: ${new Date().toISOString()}`,
    `TO: ${to}`,
    `FROM: ${SMTP_FROM}`,
    `SUBJECT: ${subject}`,
    `REAL EMAIL SENT: ${sentSuccessfully ? 'YES' : 'NO (MOCK FALLBACK)'}`,
    `TEXT CONTENT:`,
    text || '(None)',
    `HTML CONTENT:`,
    html || '(None)',
    separator,
    ''
  ].join('\n');
  
  await fs.appendFile(logPath, emailLog, 'utf8');
}

function isPaidBooking(b) {
  const type = String(b.ticket_type || b.ticketType || '').toLowerCase();
  if (type.includes('unpaid') || type.includes('free')) {
    return false;
  }
  if (
    type.includes('vip') || 
    type.includes('300') || 
    type.includes('500') || 
    type.includes('1000') || 
    type.includes('1500') || 
    type.includes('shighra') || 
    type.includes('sheegra') || 
    type.includes('suprabhata') || 
    type.includes('seva') || 
    type.includes('combo') || 
    type.includes('paid')
  ) {
    return true;
  }
  return false;
}

function getBookingStartTime(b) {
  const visitDateStr = b.visit_date || b.visitDate || b.date;
  if (!visitDateStr) return null;
  
  const baseDate = new Date(visitDateStr);
  if (isNaN(baseDate.getTime())) return null;
  
  let hour = 6; // default 6 AM
  const slotStr = String(b.slot || b.time || '').toLowerCase();
  
  const timeMatch = slotStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    const ampm = timeMatch[3];
    if (ampm === 'pm' && hour < 12) {
      hour += 12;
    } else if (ampm === 'am' && hour === 12) {
      hour = 0;
    } else if (!ampm) {
      const matchIndex = timeMatch.index;
      const context = slotStr.substring(matchIndex, matchIndex + 15);
      if (context.includes('pm') && hour < 12) {
        hour += 12;
      } else if (context.includes('am') && hour === 12) {
        hour = 0;
      }
    }
  } else {
    if (slotStr.includes('afternoon') || slotStr.includes('noon')) {
      hour = 12;
    } else if (slotStr.includes('evening') || slotStr.includes('night')) {
      hour = 16;
    } else if (slotStr.includes('morning')) {
      hour = 6;
    }
  }
  
  baseDate.setHours(hour, 0, 0, 0);
  return baseDate;
}

async function sendBookingConfirmationEmail(b) {
  const userEmail = b.email || await findUserEmailByPhone(b.phone) || 'pilgrim@divyadarshan.org';
  const isPaid = isPaidBooking(b);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9fb; color: #2d3338; margin: 0; padding: 20px; }
        .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); overflow: hidden; border: 1px solid #f0f0f5; }
        .header { background: #f97316; padding: 30px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .content { padding: 30px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #fdfdfd; padding: 20px; border-radius: 12px; border: 1px solid #f6f6f9; }
        .details-grid div { font-size: 13px; }
        .label { font-weight: 800; color: #9c9d9f; text-transform: uppercase; font-size: 10px; tracking-wider: 0.1em; display: block; margin-bottom: 4px; }
        .val { font-weight: 600; color: #2d3338; }
        .instruction-box { background: #fff7ed; border: 1px solid #ffedd5; padding: 15px; border-radius: 12px; font-size: 12px; color: #c2410c; margin-bottom: 25px; line-height: 1.6; }
        .btn { display: block; text-align: center; background: #f97316; color: white; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(249,115,22,0.2); }
        .footer { text-align: center; font-size: 11px; color: #9c9d9f; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🎟️ Booking Secured</h1>
        </div>
        <div class="content">
          <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Namaste, your spiritual journey is successfully booked! Please present this confirmation at the entry gates.</p>
          
          <div class="details-grid">
            <div>
              <span class="label">Temple</span>
              <span class="val">${b.temple_name}</span>
            </div>
            <div>
              <span class="label">Ticket ID</span>
              <span class="val" style="color: #f97316; font-family: monospace;">#${b.id}</span>
            </div>
            <div>
              <span class="label">Date</span>
              <span class="val">${b.visit_date}</span>
            </div>
            <div>
              <span class="label">Time Slot</span>
              <span class="val">${b.slot}</span>
            </div>
            <div>
              <span class="label">Pilgrims</span>
              <span class="val">${b.qty || 1} Person(s)</span>
            </div>
            <div>
              <span class="label">Payment Status</span>
              <span class="val" style="color: ${isPaid ? '#059669' : '#4b5563'}">${isPaid ? 'Paid' : 'Free/General'}</span>
            </div>
          </div>
          
          <div class="instruction-box">
            <strong>Important Instructions:</strong><br>
            Please report 30 minutes before your slot. Carry a valid government ID (Aadhar Card, Passport, etc.). Electronic ticket scan is active.
          </div>
          
          <a href="http://localhost:3000/dashboard/index.html" class="btn">View Live Dashboard</a>
        </div>
      </div>
      <div class="footer">© 2026 Divya Darshan. All rights reserved.</div>
    </body>
    </html>
  `;
  
  await sendEmail({
    to: userEmail,
    subject: `🎟️ Booking Secured - #${b.id} | Divya Darshan`,
    html,
    text: `Namaste! Your booking for ${b.temple_name} (ID: #${b.id}) on ${b.visit_date} (${b.slot}) has been secured. View the details on your dashboard at: http://localhost:3000/dashboard/index.html`
  });
}

async function sendBookingReminderEmailAndSms(b) {
  const userEmail = b.email || await findUserEmailByPhone(b.phone) || 'pilgrim@divyadarshan.org';
  const isPaid = isPaidBooking(b);
  const hours = isPaid ? 4 : 6;
  const confirmUrl = `http://localhost:3000/api/booking/confirm-ticket/${b.id}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9fb; color: #2d3338; margin: 0; padding: 20px; }
        .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #ffedd5; }
        .header { background: #ea580c; padding: 30px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .content { padding: 30px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; background: #fafafa; padding: 15px; border-radius: 12px; border: 1px solid #f1f1f5; }
        .details-grid div { font-size: 13px; }
        .label { font-weight: 800; color: #9c9d9f; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 4px; }
        .val { font-weight: 600; color: #2d3338; }
        .alert-box { background: #fff2e8; border: 1px solid #ffd8bf; padding: 15px; border-radius: 12px; font-size: 12px; color: #d4380d; margin-bottom: 25px; line-height: 1.6; font-weight: 500; }
        .btn { display: block; text-align: center; background: #ea580c; color: white; text-decoration: none; padding: 15px; border-radius: 12px; font-weight: 850; font-size: 15px; box-shadow: 0 4px 12px rgba(234,88,12,0.3); text-transform: uppercase; letter-spacing: 0.05em; }
        .footer { text-align: center; font-size: 11px; color: #9c9d9f; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>⚠️ Action Required: Confirm Your Slot</h1>
        </div>
        <div class="content">
          <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Namaste! You have an upcoming Darshan booking at **${b.temple_name}** in exactly **${hours} hours**.</p>
          
          <div class="alert-box">
            <strong>CRITICAL RESPONSE PROTOCOL:</strong><br>
            Please confirm your attendance by clicking the button below within **30 minutes**. If you do not respond, your ticket will be automatically moved to the **Waiting List** to free the slots for other eager pilgrims.
          </div>
          
          <div class="details-grid">
            <div>
              <span class="label">Temple</span>
              <span class="val">${b.temple_name}</span>
            </div>
            <div>
              <span class="label">Ticket ID</span>
              <span class="val" style="font-family: monospace;">#${b.id}</span>
            </div>
            <div>
              <span class="label">Date & Slot</span>
              <span class="val">${b.visit_date} · ${b.slot}</span>
            </div>
            <div>
              <span class="label">Pilgrims</span>
              <span class="val">${b.qty || 1} Person(s)</span>
            </div>
          </div>
          
          <a href="${confirmUrl}" class="btn">Confirm My Attendance Now</a>
        </div>
      </div>
      <div class="footer">© 2026 Divya Darshan. All rights reserved.</div>
    </body>
    </html>
  `;
  
  // 1. Send Email Reminder
  await sendEmail({
    to: userEmail,
    subject: `⚠️ Action Required: Confirm your Darshan Booking for #${b.id}`,
    html,
    text: `ACTION REQUIRED: Please confirm your booking #${b.id} for ${b.temple_name} in the next 30 minutes, or it will be released to the waiting list! Click to confirm: ${confirmUrl}`
  });
  
  // 2. Send SMS/WhatsApp Reminder
  const to = normalizeTwilioTo(b.phone);
  if (to) {
    const body = `⚠️ Divya Darshan: Action Required! Please confirm your Darshan booking #${b.id} for ${b.temple_name} in the next 30 minutes, or it will be waitlisted. Click here to confirm instantly: ${confirmUrl}`;
    twilioSendMessage({ to, body })
      .then(() => console.log(`[divyadarshan] Reminder SMS successfully sent to ${to}`))
      .catch((err) => console.warn('[divyadarshan] Twilio reminder failed:', err.message));
  }
}

async function expireBookingToWaitlist(b, viaSupabase) {
  console.log(`[divyadarshan] Expiring booking #${b.id} to Waiting List...`);
  
  b.status = 'Waiting List';
  b.waitlisted_at = new Date().toISOString();
  
  // 1. Save to Database
  if (viaSupabase && shouldUseSupabase()) {
    try {
      await supabase.from('bookings').update({ status: 'Waiting List' }).eq('id', b.id);
    } catch (dbErr) {
      console.warn('[divyadarshan] Supabase waitlist update failed:', dbErr.message);
    }
  }
  
  // Always update local store backup as well
  try {
    const store = await readLocalTempleActivityStore();
    const idx = store.bookings.findIndex(bk => bk.id === b.id);
    if (idx > -1) {
      store.bookings[idx].status = 'Waiting List';
      await writeLocalTempleActivityStore(store);
    }
  } catch (err) {
    console.warn('[divyadarshan] Local activity waitlist update failed:', err.message);
  }
  
  // 2. Release Ticket Inventory Seats if registered
  if (b.ticket_inventory_id && Number(b.qty || 0) > 0) {
    try {
      const restored = await releaseTicketInventory(b.ticket_inventory_id, Number(b.qty || 0));
      if (restored) broadcastTicketEvent('restored', restored);
    } catch (restoreError) {
      console.warn('[divyadarshan] failed to restore ticket seats after waitlisting:', restoreError.message);
    }
  }
  
  // 3. Broadcast Event
  broadcastBookingEvent('waitlisted', b);
  
  // 4. Send Expiry Notifications
  const userEmail = b.email || await findUserEmailByPhone(b.phone) || 'pilgrim@divyadarshan.org';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9fb; color: #2d3338; margin: 0; padding: 20px; }
        .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); overflow: hidden; border: 1px solid #f0f0f5; }
        .header { background: #6b7280; padding: 30px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .content { padding: 30px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #fdfdfd; padding: 20px; border-radius: 12px; border: 1px solid #f6f6f9; }
        .details-grid div { font-size: 13px; }
        .label { font-weight: 800; color: #9c9d9f; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 4px; }
        .val { font-weight: 600; color: #2d3338; }
        .footer { text-align: center; font-size: 11px; color: #9c9d9f; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>⏳ Booking Moved to Waiting List</h1>
        </div>
        <div class="content">
          <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Namaste, your booking has been moved to the **Waiting List** due to a lack of response within the confirmation threshold.</p>
          
          <div class="details-grid">
            <div>
              <span class="label">Temple</span>
              <span class="val">${b.temple_name}</span>
            </div>
            <div>
              <span class="label">Ticket ID</span>
              <span class="val" style="font-family: monospace;">#${b.id}</span>
            </div>
            <div>
              <span class="label">Date & Slot</span>
              <span class="val">${b.visit_date} · ${b.slot}</span>
            </div>
            <div>
              <span class="label">Status</span>
              <span class="val" style="color: #d97706; font-weight: bold;">Waiting List</span>
            </div>
          </div>
          
          <p style="font-size: 12px; color: #6b7280; line-height: 1.6; margin-bottom: 25px;">Your seats have been released back to other pilgrims. If you still intend to visit, please visit the portal to schedule a new Darshan slot.</p>
          
          <a href="http://localhost:3000/dashboard/index.html" class="btn" style="background: #6b7280; box-shadow: none;">Book a New Slot</a>
        </div>
      </div>
      <div class="footer">© 2026 Divya Darshan. All rights reserved.</div>
    </body>
    </html>
  `;
  
  await sendEmail({
    to: userEmail,
    subject: `⏳ Booking #${b.id} Moved to Waiting List`,
    html,
    text: `Booking Moved to Waiting List: Your booking #${b.id} has been moved to the Waiting List due to non-response. To book a new slot, visit http://localhost:3000/dashboard/index.html`
  });
  
  const to = normalizeTwilioTo(b.phone);
  if (to) {
    const body = `⏳ Divya Darshan: Your booking #${b.id} has been moved to the Waiting List due to non-response. Your slots have been released. Visit http://localhost:3000/dashboard/index.html to schedule a new visit.`;
    twilioSendMessage({ to, body }).catch(e => console.warn('[divyadarshan] waitlist SMS failed:', e.message));
  }
}

async function runBookingConfirmationChecks() {
  console.log(`[divyadarshan] Running scheduled booking checks...`);
  
  try {
    let bookings = [];
    let isSupabase = false;
    
    if (shouldUseSupabase()) {
      try {
        const { data, error } = await supabase.from('bookings').select('*').eq('status', 'Pending');
        if (!error && data) {
          bookings = data;
          isSupabase = true;
        }
      } catch (err) {
        console.warn('[divyadarshan] Supabase query in background worker failed, falling back:', err.message);
      }
    }
    
    // Always check local activity store as well
    const store = await readLocalTempleActivityStore();
    const localPending = (store.bookings || []).filter(b => b.status === 'Pending');
    
    // Merge without duplicates
    const mergedMap = new Map();
    bookings.forEach(b => mergedMap.set(b.id, { ...b, _viaSupabase: true }));
    localPending.forEach(b => {
      if (!mergedMap.has(b.id)) {
        mergedMap.set(b.id, { ...b, _viaSupabase: false });
      }
    });
    
    const pendingList = Array.from(mergedMap.values());
    console.log(`[divyadarshan] Found ${pendingList.length} total pending bookings to audit.`);
    
    const now = new Date();
    
    for (const b of pendingList) {
      const startTime = getBookingStartTime(b);
      if (!startTime) continue;
      
      const timeDiffMs = startTime.getTime() - now.getTime();
      const timeDiffHrs = timeDiffMs / (1000 * 60 * 60);
      
      const isPaid = isPaidBooking(b);
      const reminderThreshold = isPaid ? 4.0 : 6.0;
      const expiryThreshold = isPaid ? 3.5 : 5.5;
      
      // Past bookings that were never confirmed should be expired immediately
      if (timeDiffHrs <= 0) {
        await expireBookingToWaitlist(b, b._viaSupabase);
        continue;
      }
      
      // Reminder logic
      if (timeDiffHrs <= reminderThreshold && timeDiffHrs > expiryThreshold) {
        // If reminder was not sent yet
        if (!b.reminder_sent && b.status === 'Pending') {
          // Mark reminder sent
          b.reminder_sent = true;
          b.reminder_sent_at = now.toISOString();
          
          if (b._viaSupabase && shouldUseSupabase()) {
            await supabase.from('bookings').update({ 
              reminder_sent: true, 
              reminder_sent_at: b.reminder_sent_at 
            }).eq('id', b.id);
          }
          
          // update local activity store
          const activityIdx = store.bookings.findIndex(bk => bk.id === b.id);
          if (activityIdx > -1) {
            store.bookings[activityIdx].reminder_sent = true;
            store.bookings[activityIdx].reminder_sent_at = b.reminder_sent_at;
            await writeLocalTempleActivityStore(store);
          }
          
          // Send Reminder Email & SMS
          await sendBookingReminderEmailAndSms(b);
        }
      }
      
      // Expiry/Waitlist logic
      if (timeDiffHrs <= expiryThreshold && b.status === 'Pending') {
        // Double check: if they have a reminder sent or if they are within this window, expire them
        await expireBookingToWaitlist(b, b._viaSupabase);
      }
    }
  } catch (checkerErr) {
    console.error('[divyadarshan] Error running scheduled checks:', checkerErr.message);
  }
}

function buildConfirmationSuccessPage(booking, alreadyConfirmed) {
  return `
    <!DOCTYPE html>
    <html class="light" lang="en">
    <head>
      <meta charset="utf-8">
      <title>Booking Confirmed - Divya Darshan</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; }
        h1, h2, h3, .font-manrope { font-family: 'Manrope', sans-serif; }
      </style>
    </head>
    <body class="bg-[#f9f9fb] flex flex-col justify-center items-center min-h-screen text-slate-800 p-4">
      <div class="max-w-md w-full bg-white rounded-3xl shadow-[0px_12px_32px_rgba(249,115,22,0.06)] overflow-hidden border border-slate-100">
        <!-- Success Header -->
        <div class="p-8 text-center bg-emerald-50">
          <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="material-symbols-outlined text-emerald-600 text-4xl" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          </div>
          <h1 class="text-2xl font-black text-emerald-900 leading-tight">
            ${alreadyConfirmed ? 'Already Confirmed!' : 'Booking Confirmed!'}
          </h1>
          <p class="text-emerald-700 text-xs mt-1.5 font-medium">Your slot is locked in. Have a peaceful, divine Darshan! 🙏</p>
        </div>
        
        <!-- Booking Info Details -->
        <div class="p-8 space-y-6">
          <div class="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <span class="label text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">Temple</span>
              <span class="font-bold text-slate-800">${booking.temple_name}</span>
            </div>
            <div>
              <span class="label text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">Booking ID</span>
              <span class="font-mono font-bold text-orange-600 text-xs">#${booking.id}</span>
            </div>
            <div>
              <span class="label text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">Visit Date</span>
              <span class="font-bold text-slate-800">${booking.visit_date}</span>
            </div>
            <div>
              <span class="label text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">Time Slot</span>
              <span class="font-bold text-slate-800">${booking.slot}</span>
            </div>
            <div>
              <span class="label text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">Pilgrims</span>
              <span class="font-bold text-slate-800">${booking.qty || 1} Person(s)</span>
            </div>
            <div>
              <span class="label text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">Type</span>
              <span class="font-bold text-slate-800">${booking.ticket_type || 'General'}</span>
            </div>
          </div>
          
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
            <span class="material-symbols-outlined text-orange-500 mt-0.5">info</span>
            <div>
              <h4 class="text-xs font-bold text-slate-700">Important Instructions</h4>
              <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">Please arrive 30 minutes before your slot with a valid government ID. Present this ticket QR code on your dashboard at the entry gate.</p>
            </div>
          </div>
          
          <a href="/dashboard/index.html" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-manrope font-black text-center text-sm py-4 rounded-2xl block active:scale-98 transition-all shadow-md shadow-orange-500/15">
            Back to Dashboard
          </a>
        </div>
      </div>
      <p class="text-[10px] text-slate-400 mt-4">© 2026 Divya Darshan. All rights reserved.</p>
    </body>
    </html>
  `;
}

// REST Route to confirm tickets from link
app.get('/api/booking/confirm-ticket/:id', async (req, res) => {
  const id = req.params.id;
  try {
    let booking = null;
    let viaSupabase = false;
    
    if (shouldUseSupabase()) {
      try {
        const { data, error } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          booking = data;
          viaSupabase = true;
        }
      } catch (err) {}
    }
    
    if (!booking) {
      const store = await readLocalTempleActivityStore();
      booking = store.bookings.find(b => b.id === id);
    }
    
    if (!booking) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Booking Not Found</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&display=swap" rel="stylesheet">
        </head>
        <body class="bg-slate-50 flex items-center justify-center min-h-screen font-['Manrope'] p-4">
          <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <span class="text-red-500 text-6xl">⚠️</span>
            <h1 class="text-2xl font-black text-slate-800 mt-4">Booking Not Found</h1>
            <p class="text-slate-500 mt-2 text-sm">We couldn't locate any booking with ID #${id}. Please double check the link.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    const currentStatus = String(booking.status || '').toLowerCase();
    
    if (currentStatus === 'confirmed') {
      return res.send(buildConfirmationSuccessPage(booking, true));
    }
    
    if (currentStatus === 'waiting list' || currentStatus === 'waitlisted') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Booking Waitlisted</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&display=swap" rel="stylesheet">
        </head>
        <body class="bg-slate-50 flex items-center justify-center min-h-screen font-['Manrope'] p-4">
          <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <span class="text-amber-500 text-6xl">⏳</span>
            <h1 class="text-2xl font-black text-slate-800 mt-4">Moved to Waiting List</h1>
            <p class="text-slate-500 mt-2 text-sm">This booking was unfortunately moved to the waiting list due to non-response within the 30-minute threshold. Please book a new slot.</p>
            <a href="/dashboard/index.html" class="mt-6 inline-block bg-orange-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-orange-600 transition-colors">Go to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }
    
    // Update status to Confirmed
    booking.status = 'Confirmed';
    booking.confirmed_at = new Date().toISOString();
    
    if (viaSupabase && shouldUseSupabase()) {
      await supabase.from('bookings').update({ status: 'Confirmed' }).eq('id', id);
    }
    
    // Always write local store backup
    const store = await readLocalTempleActivityStore();
    const idx = store.bookings.findIndex(b => b.id === id);
    if (idx > -1) {
      store.bookings[idx].status = 'Confirmed';
      await writeLocalTempleActivityStore(store);
    }
    
    // Broadcast confirmed event
    broadcastBookingEvent('confirmed', booking);
    
    // Send Booking Confirmation Emails & SMS immediately
    await sendBookingConfirmationEmail(booking);
    
    const to = normalizeTwilioTo(booking.phone);
    if (to) {
      twilioSendMessage({
        to,
        body: `✅ Divya Darshan: Booking #${booking.id} for ${booking.temple_name} is CONFIRMED. Thank you for your response!`
      }).catch(e => console.warn('[divyadarshan] Confirmation SMS send failed:', e.message));
    }
    
    return res.send(buildConfirmationSuccessPage(booking, false));
    
  } catch (error) {
    res.status(500).send(`Server Error: ${error.message}`);
  }
});

// Run background checks every 60 seconds
setInterval(runBookingConfirmationChecks, 60000);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[divyadarshan] running on http://127.0.0.1:${PORT}`);
    console.log(
      `[divyadarshan] UI: http://127.0.0.1:${PORT}/dashboard/index.html`
    );
  });
}

module.exports = {
  app,
  bookingControl,
  buildTicketInventoryPayload,
  buildTempleSlotsForDate,
  createMacroBooking,
  deriveTempleRegistrationSlug,
  normalizeTicketStatus,
};
