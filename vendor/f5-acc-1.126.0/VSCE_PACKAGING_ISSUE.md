# VSCE Packaging Issue with f5-automation-config-converter

## Problem Summary

When building the vscode-f5-chariot extension that depends on f5-automation-config-converter-1.126.0.tgz, the `vsce package` command fails with dependency validation errors.

## Error Details

```
ERROR  Command failed: npm list --production --parseable --depth=99999 --loglevel=error
npm error code ELSPROBLEMS
npm error invalid: ajv@8.17.1 /home/ted/vscode-f5-chariot/node_modules/f5-automation-config-converter/node_modules/ajv
npm error invalid: semver@7.7.3 /home/ted/vscode-f5-chariot/node_modules/f5-automation-config-converter/node_modules/semver
```

## Root Cause

The f5-automation-config-converter package has bundled dependencies that contain version conflicts:

1. **ajv version conflict**:
   - ACC package specifies: `"ajv": "^8.17.1"`
   - Bundled dependency `@automation-toolchain/f5-appsvcs-classic-schema` expects: `"ajv": "6.12.6"`
   - Result: ajv@8.17.1 is installed but marked as invalid

2. **semver version conflict**:
   - ACC package has: `semver@7.7.3`
   - Bundled dependency `@automation-toolchain/f5-appsvcs-classic-schema` expects: `"semver": "^5.7.2"`
   - Result: semver@7.7.3 is installed but marked as invalid

## Dependency Tree

```
f5-automation-config-converter@1.126.0
├─┬ @automation-toolchain/f5-appsvcs-classic-schema@1.4.0
│ ├── ajv@8.17.1 deduped invalid: "6.12.6" from node_modules/f5-automation-config-converter/node_modules/@automation-toolchain/f5-appsvcs-classic-schema
│ └── semver@7.7.3 deduped invalid: "^5.7.2" from node_modules/f5-automation-config-converter/node_modules/@automation-toolchain/f5-appsvcs-classic-schema
├─┬ @automation-toolchain/f5-appsvcs-schema@0.52.2
│ ├─┬ ajv-errors@3.0.0
│ │ └── ajv@8.17.1 deduped invalid: "6.12.6" from node_modules/f5-automation-config-converter/node_modules/@automation-toolchain/f5-appsvcs-classic-schema
│ └── ajv@8.17.1 deduped invalid: "6.12.6" from node_modules/f5-automation-config-converter/node_modules/@automation-toolchain/f5-appsvcs-classic-schema
├── ajv@8.17.1 invalid: "6.12.6" from node_modules/f5-automation-config-converter/node_modules/@automation-toolchain/f5-appsvcs-classic-schema
└── semver@7.7.3 invalid: "^5.7.2" from node_modules/f5-automation-toolchain/f5-appsvcs-classic-schema
```

## Bundled Dependencies in ACC package.json

```json
"bundleDependencies": [
    "@automation-toolchain/f5-appsvcs-classic-schema",
    "@automation-toolchain/f5-appsvcs-schema",
    "@automation-toolchain/f5-do"
],
"dependencies": {
    "@automation-toolchain/f5-appsvcs-classic-schema": "1.4.0",
    "@automation-toolchain/f5-appsvcs-schema": "0.52.2",
    "@automation-toolchain/f5-do": "1.43.0",
    "@f5devcentral/f5-teem": "^1.6.1",
    "ajv": "^8.17.1",
    "commander": "^12.1.0",
    ...
}
```

## Impact

- `vsce package` (normal build) fails validation and cannot create the .vsix extension package
- `vsce package --no-dependencies` bypasses validation but creates a package WITHOUT node_modules
- Extension built with `--no-dependencies` fails at runtime with:
  ```
  Error: Cannot find module 'f5-conx-core/dist/logger'
  ```

## Attempted Workarounds (All Failed)

1. **npm overrides** - Doesn't work with bundled dependencies in tgz files
2. **files field in package.json** - Ignored when using `--no-dependencies`
3. **Clean reinstall** - Doesn't fix the underlying version conflicts

## Required Fix

The f5-automation-config-converter package build needs to be fixed so that:

1. The bundled dependencies (`@automation-toolchain/f5-appsvcs-classic-schema`, etc.) have peer dependencies that match what ACC specifies
2. OR the ACC package's dependency versions need to match what the bundled schemas require
3. OR the bundled dependencies need to be updated to work with newer versions of ajv and semver

## Suggested Solutions

1. **Update bundled schema packages** to accept ajv@8.x and semver@7.x
2. **Downgrade ACC dependencies** to match schema requirements (ajv@6.12.6, semver@^5.7.2)
3. **Remove bundling** and let npm resolve dependencies normally
4. **Fix peer dependencies** in @automation-toolchain/f5-appsvcs-classic-schema package

## Files to Check

- `package.json` - Check dependencies and bundleDependencies
- `scripts/prepack.sh` - Check how bundled dependencies are extracted
- The source packages for:
  - `@automation-toolchain/f5-appsvcs-classic-schema@1.4.0`
  - `@automation-toolchain/f5-appsvcs-schema@0.52.2`
  - `@automation-toolchain/f5-do@1.43.0`

## Testing the Fix

After fixing, verify with:
```bash
npm pack
# Copy the tgz to ../vscode-f5-chariot
cd ../vscode-f5-chariot
npm install
vsce package  # Should succeed without --no-dependencies
```

---

## Update: Attempted Fix Results

The new f5-automation-config-converter-1.126.0.tgz (183KB) removed bundleDependencies, but this causes a different error:

```
npm error 404 Not Found - GET https://registry.npmjs.org/@automation-toolchain%2ff5-appsvcs-classic-schema
npm error 404  '@automation-toolchain/f5-appsvcs-classic-schema@1.4.0' is not in this registry.
```

**The @automation-toolchain packages are NOT published to npm** - they only exist as local tgz files in `deps/` directory.

## The Real Solution Needed

The package **must** bundle dependencies, but needs to ensure version compatibility. The bundling should:

1. **Keep bundleDependencies** (required since they're not on npm)
2. **Fix version conflicts** by ensuring bundled packages use compatible versions

Options:
- **A)** Update the bundled schema packages to use ajv@8.x and semver@7.x
- **B)** Ensure the bundled tgz files in `deps/` have their package.json peer dependencies matching ACC's versions
- **C)** Use npm overrides in the ACC package.json to force specific versions before bundling

The prepack script that extracts deps needs to also patch version conflicts before bundling.

---

## Update 2: Package Builds Successfully BUT Runtime Error with ajv@8

✅ **Good News**: The latest package (2.5MB) now builds successfully with `vsce package`
❌ **Bad News**: Runtime error when actually using the extension

### Runtime Error

```
[ERROR]: ACC parsing failed with Error: Error converting input file. Please open an issue at https://github.com/f5devcentral/f5-automation-config-converter/issues and include the following error:
compiling schema urn:uuid:f83d84a1-b27b-441a-ae32-314b3de3315a failed, error: strict mode: unknown keyword: "bigip"
    at checkStrictMode (/home/ted/.vscode-server/extensions/f5devcentral.vscode-f5-chariot-1.126.0/node_modules/f5-automation-config-converter/node_modules/ajv/dist/compile/util.js:174:15)
    at checkUnknownRules (/home/ted/.vscode-server/extensions/f5devcentral.vscode-f5-chariot-1.126.0/node_modules/f5-automation-config-converter/node_modules/ajv/dist/compile/util.js:32:13)
    at alwaysValidSchema (/home/ted/.vscode-server/extensions/f5devcentral.vscode-f5-chariot-1.126.0/node_modules/f5-automation-config-converter/node_modules/ajv/dist/compile/util.js:19:5)
    at Object.code (/home/td/.vscode-server/extensions/f5devcentral.vscode-f5-chariot-1.126.0/node_modules/f5-automation-config-converter/node_modules/ajv/dist/vocabularies/applicator/items.js:17:42)
```

### Root Cause

**ajv@8.x has breaking changes from ajv@6.x:**
- ajv@8 runs in **strict mode** by default
- Custom keywords like `"bigip"` used in the schemas are no longer allowed without explicit registration
- The schemas were designed for ajv@6 and are not compatible with ajv@8

### Solution Options

1. **Downgrade to ajv@6.x** (recommended for quickest fix):
   ```json
   "ajv": "^6.12.6"
   ```
   This matches what the bundled schemas were originally designed for.

2. **Configure ajv@8 to disable strict mode**:
   ```javascript
   const ajv = new Ajv({ strict: false })
   ```

3. **Register custom keywords** in ajv@8:
   ```javascript
   const ajv = new Ajv()
   ajv.addKeyword('bigip')
   ```

4. **Update all schemas** to remove custom keywords and be ajv@8 compatible (most work)

### Recommendation

**Downgrade to ajv@6.12.6** - this is the safest approach that:
- Avoids breaking changes
- Maintains compatibility with existing schemas
- Requires minimal code changes
- Matches what the schemas were designed for

The upgrade to ajv@8.x introduced breaking changes that the schemas and code aren't prepared for.

---

## Update 3: RESOLVED - ajv@8 with strict mode disabled

✅ **WORKING SOLUTION**: Keep ajv@8.x but disable strict mode in bundled schema packages

### Final Solution

The [scripts/prepack.sh](scripts/prepack.sh) script now patches the bundled `@automation-toolchain` packages to:

1. **Update package.json dependencies** to use ajv@^8.17.1 and semver@^7.6.3
2. **Add `strict: false`** to all ajv constructor calls in schema validators
3. **Patches applied to:**
   - `@automation-toolchain/f5-appsvcs-classic-schema/lib/schemaValidator.js` - Added `strict: false` to getDefaultOptions()
   - `@automation-toolchain/f5-appsvcs-classic-schema/lib/tag/pointerTag.js` - Added `strict: false` to babyAjv constructor
   - `@automation-toolchain/f5-appsvcs-schema/lib/genericValidator.js` - Added `strict: false` to any ajv constructors
   - `@automation-toolchain/f5-appsvcs-schema/lib/schemaValidator.js` - Added `strict: false` to any ajv constructors

### Results

✅ **VSCE packaging**: Package builds successfully with `vsce package` (no `--no-dependencies` needed)
✅ **Runtime**: Extension works correctly - ajv@8 in non-strict mode accepts custom keywords like `"bigip"`
✅ **Package size**: 2.6 MB with all bundled dependencies included
✅ **Dependencies**: 33 bundled dependencies, no version conflicts

### How It Works

The prepack script runs during `npm pack` and:
1. Extracts `.tgz` files from `deps/` directory
2. Patches package.json files to declare ajv@^8.17.1
3. Patches JavaScript files to add `strict: false` to ajv options
4. npm then bundles the patched packages into the tarball

### Why This Works

- **ajv@8 strict mode** is what caused the runtime error
- **`strict: false`** makes ajv@8 behave like ajv@6
- Custom schema keywords like `"bigip"` are allowed in non-strict mode
- All packages now have matching dependency versions (ajv@^8.17.1)
- VSCE validation passes because there are no version conflicts

### Testing

Verified working in VSCode extension runtime - ACC successfully parses configurations without schema compilation errors.

### Related Documentation

- Full technical details: [AJV_V8_COMPATIBILITY.md](AJV_V8_COMPATIBILITY.md)
- Packaging strategy: [PACKAGING.md](PACKAGING.md)
- Prepack script: [scripts/prepack.sh](scripts/prepack.sh)
