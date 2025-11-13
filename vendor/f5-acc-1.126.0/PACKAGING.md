# Packaging for NPM Distribution

This document explains how this project is configured to be packaged and distributed as an npm library using `npm pack`.

## Problem

This project includes local dependencies stored as `.tgz` files in the `deps/` directory:
- `@automation-toolchain/f5-appsvcs-classic-schema`
- `@automation-toolchain/f5-appsvcs-schema`
- `@automation-toolchain/f5-do`

These packages are not available on the public npm registry. When using the standard `npm pack` approach with `file:` references in `package.json`, the packed tarball contains references to local files that don't exist when the package is installed elsewhere.

## Solution

The project uses npm's **bundleDependencies** feature combined with a **prepack script** to bundle these local dependencies directly into the distributed package.

### How It Works

1. **prepack script** ([scripts/prepack.sh](scripts/prepack.sh))
   - Runs automatically before `npm pack`
   - Extracts the `.tgz` files from `deps/` into `node_modules/@automation-toolchain/`
   - Places the extracted packages where npm expects to find them

2. **bundleDependencies** in [package.json](package.json)
   ```json
   "bundleDependencies": [
     "@automation-toolchain/f5-appsvcs-classic-schema",
     "@automation-toolchain/f5-appsvcs-schema",
     "@automation-toolchain/f5-do"
   ]
   ```
   - Tells npm to include these packages in the tarball
   - Prevents npm from trying to fetch them from the registry during installation

3. **files** array in [package.json](package.json)
   ```json
   "files": [
     "node_modules/@automation-toolchain",
     ...
   ]
   ```
   - Ensures the bundled dependencies are included in the package

### Creating a Distributable Package

To create a package for distribution:

```bash
npm pack
```

This will:
1. Execute `scripts/prepack.sh` to extract local dependencies
2. Bundle all dependencies listed in `bundleDependencies`
3. Create `f5-automation-config-converter-<version>.tgz`

### Installing the Package

In another project:

```bash
npm install /path/to/f5-automation-config-converter-1.126.0.tgz
```

All dependencies, including the `@automation-toolchain` packages, will be installed without requiring access to a private registry or the original `deps/` directory.

## Files Involved

- [package.json](package.json) - Contains `bundleDependencies`, `prepack` script reference, and `files` array
- [scripts/prepack.sh](scripts/prepack.sh) - Extracts local `.tgz` dependencies before packing
- [deps/](deps/) - Directory containing the local dependency tarballs

## AJV v8 Compatibility - Automated Fix

### Problem Background

The bundled `@automation-toolchain` packages (f5-appsvcs-classic-schema, f5-appsvcs-schema) were originally designed for AJV v6, but this package uses AJV v8.17.1. When the bundled packages do `require('ajv')`, Node.js module resolution loads AJV v8 from the parent package, causing compatibility issues.

**Symptoms without the fix:**
- `Error: compiling schema ... failed, error: strict mode: unknown keyword: "bigip"`
- `Error: compiling schema ... failed, error: unknown format "uri" ignored in schema`
- Runtime validation failures in VSCode extension packaging (VSCE)

### Automated Solution

The [scripts/prepack.sh](scripts/prepack.sh) script **automatically patches** the bundled dependencies during `npm pack`:

1. **Updates package.json files** to declare ajv@^8.17.1 and semver@^7.6.3 (matches parent package)
2. **Adds `strict: false`** to all ajv constructor calls in schema validators
3. **Applied to these files:**
   - `@automation-toolchain/f5-appsvcs-classic-schema/lib/schemaValidator.js`
   - `@automation-toolchain/f5-appsvcs-classic-schema/lib/tag/pointerTag.js`
   - `@automation-toolchain/f5-appsvcs-schema/lib/genericValidator.js`
   - `@automation-toolchain/f5-appsvcs-schema/lib/schemaValidator.js`

### How It Works

```bash
npm pack
```

Executes this sequence:
1. `prepack` script runs → [scripts/prepack.sh](scripts/prepack.sh)
2. Extracts `.tgz` files from `deps/` to `node_modules/@automation-toolchain/`
3. **Patches package.json** files to update ajv/semver versions
4. **Patches JavaScript** files to add `strict: false` to ajv options
5. npm bundles the **patched** packages into the tarball

### Why strict: false?

- **ajv@8 strict mode** (default) rejects custom schema keywords like `"bigip"`
- **`strict: false`** makes ajv@8 behave like ajv@6
- Custom keywords are allowed, schema compilation succeeds
- No runtime validation errors

### Results

✅ **VSCE packaging**: Builds successfully with `vsce package` (no `--no-dependencies` needed)
✅ **Runtime**: VSCode extension works correctly - ACC parses configurations without errors
✅ **Version compatibility**: No dependency conflicts - all packages use ajv@^8.17.1
✅ **Automated**: No manual fixes needed - patches applied automatically on `npm pack`

### For Developers

**No action required** - patches are applied automatically during `npm pack`.

If you need to modify the patches, edit [scripts/prepack.sh](scripts/prepack.sh) lines 25-106.

### Related Documentation

- **Detailed technical analysis**: [AJV_V8_COMPATIBILITY.md](AJV_V8_COMPATIBILITY.md)
- **VSCode extension packaging journey**: [VSCE_PACKAGING_ISSUE.md](VSCE_PACKAGING_ISSUE.md)
- **Prepack script**: [scripts/prepack.sh](scripts/prepack.sh)

## Maintenance

When updating local dependencies:

1. Place new `.tgz` files in `deps/`
2. Update the filenames in [scripts/prepack.sh](scripts/prepack.sh) if versions change
3. Update version numbers in `dependencies` section of [package.json](package.json)
4. Ensure the package names are listed in `bundleDependencies`
5. **If updating `f5-appsvcs-classic-schema`:** Verify AJV compatibility and reapply fixes from [AJV_V8_COMPATIBILITY.md](AJV_V8_COMPATIBILITY.md) if needed

## Alternative Approach: Private Registry

If you have access to a private npm registry, you could alternatively:
1. Publish the `@automation-toolchain` packages to the private registry
2. Configure `.npmrc` to point to the private registry for `@automation-toolchain` scope
3. Use normal version specifications instead of `file:` references

However, the bundleDependencies approach requires no additional infrastructure and works with standard npm.
