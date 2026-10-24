const { copyFileSync, mkdirSync } = require('node:fs');
const target = 'Gastos/static/Gastos/vendor';
mkdirSync(target, { recursive: true });
copyFileSync('node_modules/chart.js/dist/chart.umd.js', `${target}/chart.umd.js`);
copyFileSync('node_modules/chart.js/LICENSE.md', `${target}/Chart.js-LICENSE.md`);
