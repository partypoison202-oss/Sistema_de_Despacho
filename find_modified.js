const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = `${dir}/${file}`;
        if (file === 'node_modules' || file === '.git' || file === 'vendor' || file.startsWith('.')) continue;
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else {
            files.push(name);
        }
    }
    return files;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const allFiles = getFiles('.');
const modifiedToday = [];

for (const file of allFiles) {
    const stats = fs.statSync(file);
    if (stats.mtime >= today) {
        modifiedToday.push(`${file} - ${stats.mtime.toLocaleString()}`);
    }
}

console.log(modifiedToday.join('\n'));
