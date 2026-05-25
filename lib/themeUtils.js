const THEME_PRESETS = {
  'Devotional Warm': { primary: '#C0392B', accent: '#E67E22', background: '#FDF6EC' },
  'Celestial Cool': { primary: '#1A237E', accent: '#7986CB', background: '#F0F4FF' },
  'Forest Green': { primary: '#2E7D32', accent: '#A5D6A7', background: '#F1F8E9' },
  'Royal Gold': { primary: '#B8860B', accent: '#FFD700', background: '#FFFDE7' },
  'Desert Sand': { primary: '#8D6E63', accent: '#FFCC80', background: '#FFF8F0' },
  'Ocean Blue': { primary: '#0277BD', accent: '#4FC3F7', background: '#E1F5FE' },
  'Midnight Indigo': { primary: '#283593', accent: '#9FA8DA', background: '#1A1A2E' },
  'Rose Bloom': { primary: '#AD1457', accent: '#F48FB1', background: '#FCE4EC' },
  'Ivory Classic': { primary: '#5D4037', accent: '#BCAAA4', background: '#FAFAFA' },
  'Sacred Saffron': { primary: '#E65100', accent: '#FFB74D', background: '#FFF3E0' },
  'Lotus Pink': { primary: '#880E4F', accent: '#CE93D8', background: '#F3E5F5' },
  'Jade Temple': { primary: '#004D40', accent: '#80CBC4', background: '#E0F2F1' },
};

const BACKGROUND_STYLE_MAP = {
  Light: 'linear-gradient(180deg, #fbfcff 0%, #f4f6fd 100%)',
  Dark: 'linear-gradient(180deg, #141826 0%, #0f1220 100%)',
  Earthy: 'linear-gradient(180deg, #f4eee8 0%, #efe4d5 100%)',
  'Devotional Warm': 'linear-gradient(180deg, #fff3e6 0%, #fde7d0 100%)',
  'Celestial Cool': 'linear-gradient(180deg, #f4f7ff 0%, #e8eeff 100%)',
  'Forest Green': 'linear-gradient(180deg, #eef8f1 0%, #e1f2e4 100%)',
  'Royal Gold': 'linear-gradient(180deg, #fffbea 0%, #fff4c4 100%)',
  'Desert Sand': 'linear-gradient(180deg, #fff8f0 0%, #f4e7da 100%)',
  'Ocean Blue': 'linear-gradient(180deg, #ebf9ff 0%, #d9f1fb 100%)',
  'Midnight Indigo': 'linear-gradient(180deg, #1d2040 0%, #13162d 100%)',
  'Rose Bloom': 'linear-gradient(180deg, #fff1f7 0%, #fde3ee 100%)',
  'Ivory Classic': 'linear-gradient(180deg, #faf8f3 0%, #f1ede4 100%)',
};

function sanitizeHex(value, fallback) {
  const hex = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : fallback;
}

function hexToRgb(hex) {
  const value = sanitizeHex(hex, '#000000').replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(base, target, ratio) {
  const from = hexToRgb(base);
  const to = hexToRgb(target);
  const amount = Math.max(0, Math.min(1, Number(ratio || 0)));
  return rgbToHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  });
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const convert = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const red = convert(r);
  const green = convert(g);
  const blue = convert(b);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(left, right) {
  const a = relativeLuminance(left);
  const b = relativeLuminance(right);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function bestTextColor(background) {
  const white = '#ffffff';
  const ink = '#111827';
  return contrastRatio(background, white) >= contrastRatio(background, ink) ? white : ink;
}

function getThemePreset(name) {
  return THEME_PRESETS[String(name || '').trim()] || null;
}

function buildTempleTheme(profile = {}) {
  const preset = getThemePreset(profile.theme_preset || profile.themePreset || profile.theme?.preset);
  const primary = sanitizeHex(profile.primary_color || profile.primary || preset?.primary, preset?.primary || '#4c56af');
  const accent = sanitizeHex(profile.accent_color || profile.accent || preset?.accent, preset?.accent || '#2ecc71');
  const secondary = sanitizeHex(profile.secondary_color || profile.secondary || accent, accent);
  const backgroundStyle = String(profile.background_style || profile.backgroundStyle || profile.theme?.backgroundStyle || profile.theme_preset || 'Light');
  const backgroundValue = BACKGROUND_STYLE_MAP[backgroundStyle] || BACKGROUND_STYLE_MAP.Light;

  return {
    preset: preset ? String(profile.theme_preset || profile.themePreset || profile.theme?.preset) : null,
    primary,
    accent,
    secondary,
    backgroundStyle,
    backgroundValue,
  };
}

function buildTempleThemeCssVars(profile = {}) {
  const theme = buildTempleTheme(profile);
  const backgroundHex = theme.backgroundValue.startsWith('linear-gradient')
    ? sanitizeHex(theme.backgroundValue.match(/#[0-9a-fA-F]{6}/)?.[0], '#f4f6fd')
    : sanitizeHex(theme.backgroundValue, '#f4f6fd');
  const textPrimary = bestTextColor(backgroundHex);
  const textSecondary = mixHex(textPrimary, backgroundHex, textPrimary === '#ffffff' ? 0.34 : 0.48);
  const cardBg = mixHex(backgroundHex, textPrimary === '#ffffff' ? '#ffffff' : '#ffffff', textPrimary === '#ffffff' ? 0.06 : 0.72);
  const border = mixHex(theme.primary, backgroundHex, 0.72);
  const shadow = mixHex(theme.primary, '#ffffff', 0.78);
  const btnText = bestTextColor(theme.primary);

  return {
    '--primary': theme.primary,
    '--secondary': theme.secondary,
    '--accent': theme.accent,
    '--bg-style': theme.backgroundValue,
    '--bg': backgroundHex,
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--card-bg': cardBg,
    '--border': border,
    '--shadow': shadow,
    '--btn-text': btnText,
  };
}

module.exports = {
  BACKGROUND_STYLE_MAP,
  THEME_PRESETS,
  bestTextColor,
  buildTempleTheme,
  buildTempleThemeCssVars,
  contrastRatio,
  getThemePreset,
  hexToRgb,
  mixHex,
  sanitizeHex,
};
