const fs = require('fs');
const vm = require('vm');
const cheerio = require('cheerio');

const html = fs.readFileSync('dashboard/index.html', 'utf8');
const $ = cheerio.load(html);

$('script').each((i, el) => {
    const code = $(el).html();
    if (code && code.trim().length > 0) {
        // Find the line offset of this script block in the HTML file
        const linesBefore = html.split($(el).html())[0].split('\n').length;
        try {
            new vm.Script(code, { filename: `dashboard/index.html`, lineOffset: linesBefore - 1 });
            console.log(`Script ${i} compiled successfully.`);
        } catch (e) {
            console.error(`ERROR compiling Script ${i} (starts around line ${linesBefore}):`, e.stack);
            process.exit(1);
        }
    }
});
console.log("All scripts compiled successfully!");
