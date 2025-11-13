# AJV v8 Compatibility Fixes for f5-automation-config-converter

**Date:** 2025-10-28
**Version:** 1.126.0
**Affected Package:** `@automation-toolchain/f5-appsvcs-classic-schema` v1.4.0

---

## Table of Contents

1. [Problem Description](#problem-description)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Fixes Required](#fixes-required)
4. [Quick Fix Guide](#quick-fix-guide)
5. [Long-term Solutions](#long-term-solutions)
6. [Verification](#verification)
7. [Technical Details](#technical-details)
8. [References](#references)

---

## Problem Description

When using the `mainAPI` function from `f5-automation-config-converter` to convert configurations, the AS3 Classic schema validation fails with multiple errors.

### Error Symptoms

```
strict mode: unknown keyword: "bigip"
unknown format "uri" ignored in schema
strict mode: missing type "number,string" for keyword "format"
strict mode: missing type "object" for keyword "maxProperties"
strict mode: use allowUnionTypes to allow union type keyword
Please run appropriate compile function first before attempting validation
```

### Impact

Without these fixes:
- The `mainAPI` function will fail
- AS3 Classic schema validation will not work
- TMOS configuration conversion will be blocked

---

## Root Cause Analysis

The `@automation-toolchain/f5-appsvcs-classic-schema` package was designed for **AJV v6**, but when installed as a dependency of `f5-automation-config-converter`, Node.js module resolution loads **AJV v8.17.1** from the parent package instead of the intended AJV v6.12.6.

### Module Resolution Issue

```
f5-automation-config-converter/
├── package.json (dependencies: "ajv": "^8.17.1")
├── node_modules/
│   ├── ajv@8.17.1/          ← Resolved here!
│   └── @automation-toolchain/f5-appsvcs-classic-schema/
│       ├── package.json (dependencies: "ajv": "6.12.6")
│       └── lib/
│           └── schemaValidator.js (require('ajv'))  ← Gets v8 from parent!
```

When `schemaValidator.js` does `require('ajv')`, Node.js walks up the directory tree and finds AJV v8 in the parent `node_modules/` before finding the intended v6.

### AJV v8 Breaking Changes

AJV v8 introduced several breaking changes that cause compatibility issues:

1. **Strict mode enabled by default** - Enforces `strictTypes`, `strictTuples` validation
2. **Removed built-in formats** - Including `uri`, `email`, etc.
3. **Different keyword handling** - More strict validation of custom keywords
4. **Deprecated options** - `jsonPointers` replaced with `jsPropertySyntax`

---

## Fixes Required

Three files in the bundled `@automation-toolchain/f5-appsvcs-classic-schema` package need modifications:

### Fix 1: Register `bigip` Custom Keyword

**File:** `lib/adcParserKeywords.js`

**Problem:** The schema uses `"bigip"` in `dependencies` objects (a valid JSON Schema pattern), but AJV v8 strict mode interprets it as an unknown validation keyword.

**Example schema usage:**
```json
{
  "dependencies": {
    "bigip": {
      "not": { "required": ["use"] }
    }
  }
}
```

**Solution:** Register `bigip` as a no-op custom keyword.

---

### Fix 2: Disable AJV v8 Strict Mode

**File:** `lib/schemaValidator.js`

**Problem:** AJV v8 strict mode enforces type declarations on all validation keywords, causing errors on the existing schema that was designed without strict type requirements.

**Solution:** Disable strict mode options to make AJV v8 behave like v6.

---

### Fix 3: Add `uri` Format Validator

**File:** `lib/adcParserFormats.js`

**Problem:** AJV v8 removed all built-in format validators. The schema uses `"format": "uri"` in multiple places.

**Solution:** Add a basic `uri` format validator to replace the removed built-in.

---

## Quick Fix Guide

Apply these changes after `npm install` to restore functionality.

### Change 1: Add `bigip` Keyword

**File:** `node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/adcParserKeywords.js`

**Find this section** (around line 67):

```javascript
        })
    }
];

module.exports = {
    keywords
};
```

**Replace with:**

```javascript
        })
    },
    {
        name: 'bigip',
        definition: () => ({
            metaSchema: {
                type: ['object', 'string', 'array', 'number', 'boolean']
            },
            validate() {
                // No-op keyword used in dependencies - always valid
                // This is a marker/metadata keyword in the schema
                return true;
            }
        })
    }
];

module.exports = {
    keywords
};
```

---

### Change 2: Disable Strict Mode

**File:** `node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/schemaValidator.js`

**Find this method** (around line 104):

```javascript
    static getDefaultOptions() {
        return {
            allErrors: false,
            verbose: true,
            jsonPointers: true,
            async: false,
            useDefaults: true
        };
    }
```

**Replace with:**

```javascript
    static getDefaultOptions() {
        return {
            allErrors: false,
            verbose: true,
            jsonPointers: true,
            async: false,
            useDefaults: true,
            strict: false,
            strictTypes: false,
            strictTuples: false,
            allowUnionTypes: true
        };
    }
```

**Options explained:**

- `strict: false` - Disables overall strict mode
- `strictTypes: false` - Allows validation keywords without explicit type declarations
- `strictTuples: false` - Disables strict tuple validation
- `allowUnionTypes: true` - Allows union types (e.g., `type: ["string", "number"]`)

---

### Change 3: Add `uri` Format

**File:** `node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/adcParserFormats.js`

**Find this section** (around line 53):

```javascript
    // 'f5ipv4' matches IPv6 with optional %RD and/or /masklen
    {
        name: 'f5ipv6',
        check: (address) => address === '' || ipUtil.isIPv6(address)

    }
];

module.exports = formats;
```

**Replace with:**

```javascript
    // 'f5ipv4' matches IPv6 with optional %RD and/or /masklen
    {
        name: 'f5ipv6',
        check: (address) => address === '' || ipUtil.isIPv6(address)

    },

    // 'uri' format for AJV v8 compatibility (removed from AJV v8 core)
    // Basic URI validation - accepts most valid URIs
    {
        name: 'uri',
        check: /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/)?[^\s]*$/i
    }
];

module.exports = formats;
```

---

### Multiple Installations

If you have multiple installations of the package, apply the same changes to all locations:

**Installation 1:**
```
/home/ted/accc/node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/
```

**Installation 2:**
```
/home/ted/vscode-f5-chariot/node_modules/f5-automation-config-converter/node_modules/@automation-toolchain/f5-appsvcs-classic-schema/lib/
```

---

## Automated Solution (IMPLEMENTED)

✅ **The fixes are now automated in the prepack script** - no manual intervention required!

The [scripts/prepack.sh](scripts/prepack.sh) script automatically applies compatibility patches during `npm pack`:

1. Updates bundled package.json files to use ajv@^8.17.1 and semver@^7.6.3
2. Adds `strict: false` to ajv constructors in schema validators
3. Patches are bundled directly into the distributed tarball

**Result**: The distributed package works out-of-the-box with ajv@8, no post-install fixes needed.

See [PACKAGING.md](PACKAGING.md) for details on how the automated patching works.

---

## Alternative Long-term Solutions

The manual fixes above are **lost when running `npm install`** in development. For permanent development solutions, consider:

### Option 1: Use patch-package (Recommended)

Automatically reapply patches after every `npm install`.

**Install patch-package:**

```bash
npm install patch-package --save-dev
```

**After applying manual fixes, create a patch:**

```bash
npx patch-package @automation-toolchain/f5-appsvcs-classic-schema
```

**Add to package.json:**

```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

**Result:** A `patches/` directory will be created with patch files that automatically apply after `npm install`.

---

### Option 2: Automate in prepack.sh ✅ IMPLEMENTED

✅ **This solution is now implemented!**

The `scripts/prepack.sh` script automatically applies ajv@8 compatibility fixes after extracting bundled dependencies. The patches add `strict: false` to all ajv constructors, making ajv@8 behave like ajv@6.

See [scripts/prepack.sh](scripts/prepack.sh) lines 25-106 for the implementation.

---

### Option 3: Rebuild Tarball

Permanently fix the tarball in the `deps/` directory.

```bash
# Extract the tarball
cd deps
tar -xzf f5-appsvcs-classic-schema-1.4.0.tgz

# Apply fixes to package/lib/
cd package
# ... apply the three fixes ...

# Recreate tarball
cd ..
tar -czf f5-appsvcs-classic-schema-1.4.0-patched.tgz package/

# Update prepack.sh to use the patched version
```

---

### Option 4: Submit Upstream PR

Submit a pull request to the official `@automation-toolchain/f5-appsvcs-classic-schema` repository:

1. Fork the repository
2. Apply the three fixes
3. Add AJV v8 to `peerDependencies` or update to support both v6 and v8
4. Submit PR with this issue as context
5. Wait for upstream merge and new release

---

## Verification

### Important: Restart Required

**After applying the fixes, you MUST restart Node.js or reload VSCode** to clear the module cache. Node.js caches required modules, so changes won't take effect until the process restarts.

**For VSCode Extensions:**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Reload Window" and select "Developer: Reload Window"
3. Or press F1 and select "Developer: Restart Extension Host"

**For Node.js Scripts:**
- Stop and restart your Node.js process
- If using `nodemon`, it should restart automatically

### Test Script

After applying fixes, verify functionality:

```javascript
const accc = require('f5-automation-config-converter');

const config = `
ltm pool /Common/test_pool {
    members {
        /Common/192.168.1.10:80 { }
    }
}
`;

accc.mainAPI(config)
    .then(result => {
        console.log('✓ Success! Conversion completed.');
        console.log(JSON.stringify(result.declaration, null, 2));
    })
    .catch(err => {
        console.error('✗ Error:', err.message);
        process.exit(1);
    });
```

### Expected Output

**Success:**
- No AJV schema compilation errors
- No strict mode warnings (informational warnings about deprecated options are okay)
- Declaration object is returned with converted AS3 configuration

**Failure (if fixes not applied):**
```
Error: compiling schema ... failed, error: strict mode: unknown keyword: "bigip"
```

---

## Technical Details

### JSON Schema `dependencies` Keyword

The `dependencies` keyword in JSON Schema allows property names as keys to trigger validation:

```json
{
  "properties": {
    "bigip": { "type": "string" },
    "use": { "type": "string" }
  },
  "dependencies": {
    "bigip": {
      "not": { "required": ["use"] }
    }
  }
}
```

This means: "If `bigip` property exists, then `use` property must NOT exist."

AJV v8 strict mode misinterprets `"bigip"` as a validation keyword instead of a property name reference.

---

### AJV v6 vs v8 Compatibility Matrix

| Feature | AJV v6 | AJV v8 | Impact |
|---------|--------|--------|--------|
| Strict mode default | Off | On | Schema must have explicit types |
| Built-in formats | Included | Removed | Must add manually or use ajv-formats |
| `jsonPointers` option | Supported | Deprecated | Warning message only |
| Custom keywords | Simple registration | Stricter validation | Must define metaSchema |
| Union types | Allowed | Requires flag | Must enable `allowUnionTypes` |

---

### Files Modified Summary

1. **`lib/adcParserKeywords.js`** (lines 67-79)
   - Added `bigip` keyword with no-op validator
   - Prevents "unknown keyword" error

2. **`lib/schemaValidator.js`** (lines 111-114)
   - Added 4 strict mode options
   - Makes AJV v8 behave like v6

3. **`lib/adcParserFormats.js`** (lines 59-64)
   - Added `uri` format with regex validator
   - Replaces removed AJV v8 built-in format

**Total changes:** ~20 lines added across 3 files

---

## Environment Details

- **Node.js:** v22.14.0
- **f5-automation-config-converter:** 1.126.0
- **@automation-toolchain/f5-appsvcs-classic-schema:** 1.4.0
- **AJV (parent package):** 8.17.1
- **AJV (schema package):** 6.12.6 (not loaded due to module resolution)

---

## References

- [AJV v6 to v8 Migration Guide](https://ajv.js.org/v6-to-v8-migration.html)
- [AJV Strict Mode Documentation](https://ajv.js.org/strict-mode.html)
- [JSON Schema Dependencies Keyword](https://json-schema.org/understanding-json-schema/reference/conditionals.html#dependencies)
- [AJV Custom Keywords](https://ajv.js.org/guide/user-keywords.html)
- [AJV Formats](https://ajv.js.org/guide/formats.html)

---

## Notes

### Informational Warnings (Safe to Ignore)

These warnings may still appear but don't affect functionality:

```
NOT SUPPORTED: option jsonPointers. Deprecated jsPropertySyntax can be used instead.
these parameters are deprecated, see docs for addKeyword
```

These are informational only and don't prevent the schema from compiling or validating.

### Bundle Dependencies Context

This package uses `bundleDependencies` to include `@automation-toolchain` packages directly in the distributed tarball. See [PACKAGING.md](PACKAGING.md) for details on the packaging strategy.

When updating `f5-appsvcs-classic-schema` in the future:
1. Check if it has been updated for AJV v8 compatibility
2. If not, reapply these fixes
3. Test thoroughly with the verification script above

---

## Support

For issues or questions:
1. Check this document first
2. Verify all three fixes are applied correctly
3. Test with the verification script
4. Check Node.js and package versions match the environment details above

---

*Document last updated: 2025-10-28*
