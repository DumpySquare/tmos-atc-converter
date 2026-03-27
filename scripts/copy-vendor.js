const fs = require('fs');
const path = require('path');

const copies = [
    ['src/vendor/f5-appsvcs-classic-schema/lib/properties.json', 'dist/vendor/f5-appsvcs-classic-schema/lib/properties.json'],
    ['src/vendor/f5-appsvcs-classic-schema/schema/latest/adc-schema.json', 'dist/vendor/f5-appsvcs-classic-schema/schema/latest/adc-schema.json'],
    ['src/vendor/f5-do/lib/configItems.json', 'dist/vendor/f5-do/lib/configItems.json'],
];

const dirs = [
    'src/vendor/f5-do/schema',
    'dist/vendor/f5-do/schema',
];

for (const [src, dest] of copies) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest);
}

// Copy f5-do/schema directory recursively
fs.cpSync(dirs[0], dirs[1], { recursive: true });
