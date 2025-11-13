#!/bin/bash

# Extract local dependencies before packing
echo "Extracting local dependencies for bundling..."

# Remove existing bundled dependencies to avoid conflicts
rm -rf node_modules/@automation-toolchain

mkdir -p node_modules/@automation-toolchain

# Extract each dependency
cd deps

tar -xzf f5-appsvcs-classic-schema-1.4.0.tgz -C ../node_modules/@automation-toolchain/
mv ../node_modules/@automation-toolchain/package ../node_modules/@automation-toolchain/f5-appsvcs-classic-schema

tar -xzf f5-appsvcs-schema-0.52.2.tgz -C ../node_modules/@automation-toolchain/
mv ../node_modules/@automation-toolchain/package ../node_modules/@automation-toolchain/f5-appsvcs-schema

tar -xzf f5-declarative-onboarding-for-f5-acc-1.43.0.tgz -C ../node_modules/@automation-toolchain/
mv ../node_modules/@automation-toolchain/package ../node_modules/@automation-toolchain/f5-do

cd ..

# Patch bundled dependencies to use compatible ajv and semver versions
echo "Patching bundled dependencies for version compatibility..."

# Update f5-appsvcs-classic-schema to use ajv ^8.17.1 and semver ^7.6.3
node -e "
const fs = require('fs');
const path = './node_modules/@automation-toolchain/f5-appsvcs-classic-schema/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.dependencies.ajv = '^8.17.1';
pkg.dependencies.semver = '^7.6.3';
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"

# Patch f5-appsvcs-classic-schema schemaValidator.js to add strict: false for ajv@8
node -e "
const fs = require('fs');
const path = './node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/schemaValidator.js';
let content = fs.readFileSync(path, 'utf8');
// Patch getDefaultOptions to include strict: false for ajv@8 compatibility
content = content.replace(
  'static getDefaultOptions() {\n        return {\n            allErrors: false,\n            verbose: true,\n            jsonPointers: true,\n            async: false,\n            useDefaults: true\n        };',
  'static getDefaultOptions() {\n        return {\n            allErrors: false,\n            verbose: true,\n            jsonPointers: true,\n            async: false,\n            useDefaults: true,\n            strict: false\n        };'
);
fs.writeFileSync(path, content);
"

# Patch f5-appsvcs-classic-schema pointerTag.js to add strict: false
node -e "
const fs = require('fs');
const path = './node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/tag/pointerTag.js';
let content = fs.readFileSync(path, 'utf8');
// Add strict: false to babyAjv constructor
content = content.replace(
  'const babyAjv = new AJV({\n    allErrors: false,\n    verbose: true,\n    useDefaults: true\n});',
  'const babyAjv = new AJV({\n    allErrors: false,\n    verbose: true,\n    useDefaults: true,\n    strict: false\n});'
);
fs.writeFileSync(path, content);
"

# Update f5-appsvcs-schema to use ajv ^8.17.1
node -e "
const fs = require('fs');
const path = './node_modules/@automation-toolchain/f5-appsvcs-schema/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.dependencies.ajv = '^8.17.1';
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
"

# Patch f5-appsvcs-schema validators to add strict: false for ajv@8
node -e "
const fs = require('fs');
const files = [
  './node_modules/@automation-toolchain/f5-appsvcs-schema/lib/genericValidator.js',
  './node_modules/@automation-toolchain/f5-appsvcs-schema/lib/schemaValidator.js'
];
files.forEach(path => {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    // Add strict: false to any new AJV() calls that don't already have it
    content = content.replace(/new\s+(?:AJV|Ajv)\s*\(\s*\{([^}]+)\}\s*\)/g, (match, options) => {
      if (!options.includes('strict')) {
        return match.replace('{', '{ strict: false,');
      }
      return match;
    });
    fs.writeFileSync(path, content);
  }
});
"

# Update f5-do to use ajv ^8.17.1 if it has ajv dependency
node -e "
const fs = require('fs');
const path = './node_modules/@automation-toolchain/f5-do/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
if (pkg.dependencies && pkg.dependencies.ajv) {
  pkg.dependencies.ajv = '^8.17.1';
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
}
"

echo "Dependencies extracted and patched successfully"
