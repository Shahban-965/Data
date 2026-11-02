'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith('.js') && !full.includes(`${path.sep}vendor${path.sep}`) ? [full] : [];
  });
}
const files = walk(path.join(root, 'js')).concat([path.join(root, 'main.js'), path.join(root, 'preload.js')]);
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Syntax OK: ${files.length} project JavaScript files`);
