const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTempleThemeCssVars } = require('../lib/themeUtils');

test('buildTempleThemeCssVars respects preset-backed custom temple theme values', () => {
  const vars = buildTempleThemeCssVars({
    theme_preset: 'Celestial Cool',
    primary_color: '#123456',
    accent_color: '#abcdef',
    secondary_color: '#654321',
    background_style: 'Forest Green',
  });

  assert.equal(vars['--primary'], '#123456');
  assert.equal(vars['--accent'], '#abcdef');
  assert.equal(vars['--secondary'], '#654321');
  assert.match(vars['--bg-style'], /linear-gradient/i);
  assert.match(vars['--bg'], /^#[0-9a-f]{6}$/i);
  assert.match(vars['--text-primary'], /^#[0-9a-f]{6}$/i);
  assert.match(vars['--btn-text'], /^#[0-9a-f]{6}$/i);
});
