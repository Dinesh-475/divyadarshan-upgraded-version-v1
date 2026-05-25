const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

test('i18n centralized database completeness and fallback capability', async (t) => {
    // Read the i18n file content
    const i18nPath = path.resolve('/Users/octane/Documents/PROJECTS/divyadarshan/shared/i18n.js');
    let fileContent = fs.readFileSync(i18nPath, 'utf8');

    // Append helper to expose const variables to window object for testing
    fileContent += '\nwindow.DD_I18N_DICTIONARY = DD_I18N_DICTIONARY;\n';

    // Create a mock DOM with localStorage enabled by setting a URL
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div class="dd-lang-selector-placeholder"></div></body></html>', {
        url: "http://localhost",
        runScripts: "dangerously"
    });

    // Execute script in the mock window scope
    dom.window.eval(fileContent);

    const { DD_I18N_DICTIONARY } = dom.window;

    await t.test('DD_I18N_DICTIONARY exists and contains all 8 major regional Indic languages', () => {
        assert.ok(DD_I18N_DICTIONARY, 'Dictionary should be defined');
        
        const expectedLanguages = ['hi', 'kn', 'ta', 'te', 'ml', 'mr', 'bn', 'gu'];
        expectedLanguages.forEach(lang => {
            assert.ok(DD_I18N_DICTIONARY[lang], `Dictionary should have verified translations for language code: "${lang}"`);
        });
    });

    await t.test('All languages have aligned critical portal keys', () => {
        const langCodes = ['hi', 'kn', 'ta', 'te', 'ml', 'mr', 'bn', 'gu'];
        const sampleKeys = [
            'logo-title', 'nav-register', 'nav-planner', 'top-signin',
            'login-header-subtitle', 'login-btn-signin', 'login-btn-signup',
            'admin-sidebar-dashboard', 'admin-sidebar-parking',
            'wizard-header-title', 'wizard-btn-submit',
            'micro-tab-home', 'micro-tab-booking', 'micro-btn-book'
        ];

        langCodes.forEach(lang => {
            const dict = DD_I18N_DICTIONARY[lang];
            sampleKeys.forEach(key => {
                assert.ok(dict[key], `Language "${lang}" should have translation for key: "${key}"`);
                assert.ok(dict[key].trim().length > 0, `Translation key "${key}" for "${lang}" should not be empty`);
            });
        });
    });
});
