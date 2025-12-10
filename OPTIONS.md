# Options Documentation

Complete reference for all configuration options supported by tmos-converter.

## Table of Contents
- [AS3 Conversion Options](#as3-conversion-options)
- [DO Conversion Options](#do-conversion-options)
- [Common Options](#common-options)
- [Usage Examples](#usage-examples)

---

## AS3 Conversion Options

Options that apply to `toAS3()` and `convertToAS3()` functions.

### `next` (boolean)
**Default:** `false` (Classic mode)
**Purpose:** Controls whether to generate AS3 Classic or AS3 Next declarations

**Note:** AS3 Next support has been removed from this standalone converter. This option still exists in the code for compatibility but setting it to `true` is not supported. Always use `false` or omit this option.

**Effects when `true` (legacy/unsupported):**
- Changes declaration label to "F5 BIG-IP Next Converted Declaration"
- Removes route domains from pool member addresses
- Handles virtual route domains differently
- Removes 'source' addresses from virtual addresses
- Renames TCP profile properties (`abc` → `appropriateByteCounting`, `ecn` → `explicitCongestionNotification`)
- Modifies HTTP compression content-type handling
- Adjusts client-SSL authentication properties
- Deletes virtual-address properties not supported in Next

**Code References:**
- [src/utils/declarationBase.js:28](src/utils/declarationBase.js#L28) - Declaration label
- [src/converters/as3/index.js:568-580](src/converters/as3/index.js#L568-L580) - Virtual-address handling
- [src/converters/as3/index.js:609-651](src/converters/as3/index.js#L609-L651) - Pool route domain removal
- [src/converters/as3/index.js:674-691](src/converters/as3/index.js#L674-L691) - Virtual source address removal
- [src/converters/as3/index.js:700-715](src/converters/as3/index.js#L700-L715) - HTTP compression
- [src/converters/as3/index.js:717-728](src/converters/as3/index.js#L717-L728) - TCP profile renaming
- [src/converters/as3/index.js:730-745](src/converters/as3/index.js#L730-L745) - Client-SSL auth

---

### `controls` (boolean)
**Default:** `false`
**Purpose:** Add AS3 `Controls` class to declaration for debugging

When enabled, adds:
```json
{
  "controls": {
    "class": "Controls",
    "trace": true,
    "logLevel": "debug"
  }
}
```

**Use Case:** Enable detailed AS3 processing logs when troubleshooting conversions

**Code Reference:** [src/utils/declarationBase.js:38-44](src/utils/declarationBase.js#L38-L44)

---

### `skipTMOSConvertProcess` (boolean)
**Default:** `false`
**Purpose:** Skip the TMOS → AS3 conversion and only run cleanup

When `true`:
- Skips the main `as3Convert()` function
- Only runs `as3ClassicCleanUp()` on the input
- Assumes input is already an AS3 declaration

**Use Case:** When you have a pre-converted AS3 declaration and only want to run cleanup/validation steps

**Code Reference:** [src/converters/as3/index.js:988-990](src/converters/as3/index.js#L988-L990)

---

### `requestContext` (object)
**Default:** `undefined`
**Purpose:** Logging context for detailed conversion tracking

Object with logging methods:
- `logSkipTmshProperty(data)` - Log when a TMOS property is skipped
- `logRenameProperty(data)` - Log when a property is renamed
- `logRemoveProperty(data)` - Log when a property is removed
- `logRenamedProperty(data)` - Log object renaming

**Use Case:** Advanced debugging and audit trails for enterprise conversions

**Code References:**
- [src/converters/as3/index.js:402](src/converters/as3/index.js#L402) - Context initialization
- [src/converters/as3/engine/converter.js:294](src/converters/as3/engine/converter.js#L294) - Skip logging
- [src/converters/as3/engine/converter.js:482](src/converters/as3/engine/converter.js#L482) - Rename logging
- [src/utils/globalRenameAndSkippedObject.js:398](src/utils/globalRenameAndSkippedObject.js#L398) - Remove logging

---

### `jsonLogs` (boolean)
**Default:** `false`
**Purpose:** Enable structured JSON logging via `requestContext`

When `true`:
- Activates `requestContext` logging methods
- Logs property transformations in structured format
- Must be used with `requestContext` object

**Use Case:** Machine-readable audit logs for automated pipelines

**Code References:**
- [src/converters/as3/engine/converter.js:287](src/converters/as3/engine/converter.js#L287)
- [src/converters/as3/engine/converter.js:481](src/converters/as3/engine/converter.js#L481)
- [src/utils/globalRenameAndSkippedObject.js:386](src/utils/globalRenameAndSkippedObject.js#L386)

---

### `disableAnalytics` (boolean)
**Default:** `false`
**Purpose:** Legacy option - no effect in standalone converter

This option was used in the original f5-acc for telemetry. In this standalone converter it has no effect but is preserved for API compatibility.

**Code Reference:** Test file only - [test/engines/as3ClassicCleanUp/as3ClassicCleanUp-spec.js:35](test/engines/as3ClassicCleanUp/as3ClassicCleanUp-spec.js#L35)

---

## DO Conversion Options

Options that apply to `toDO()` and `convertToDO()` functions.

### `controls` (boolean)
**Default:** `false`
**Purpose:** Add DO `Controls` class to declaration

When enabled, adds:
```json
{
  "controls": {
    "class": "Controls",
    "userAgent": "TMOS-CONVERTER/1.0.0",
    "trace": true,
    "traceResponse": true,
    "dryRun": false
  }
}
```

**Use Case:** Enable detailed DO processing logs and dry-run mode

**Code Reference:** [src/utils/declarationBase.js:59-67](src/utils/declarationBase.js#L59-L67)

---

## Common Options

Options that work with both AS3 and DO converters.

### Options Object Structure

```javascript
const options = {
  // AS3-specific
  next: false,                    // Classic mode (Next not supported)
  skipTMOSConvertProcess: false,  // Skip conversion, cleanup only

  // Common
  controls: false,                // Add Controls class for debugging

  // Advanced logging (AS3 only)
  jsonLogs: false,                // Enable structured logging
  requestContext: {               // Custom logging context
    logSkipTmshProperty: (data) => {},
    logRenameProperty: (data) => {},
    logRemoveProperty: (data) => {},
    logRenamedProperty: (data) => {}
  },

  // Legacy/compatibility
  disableAnalytics: true          // No effect in standalone
};
```

---

## Usage Examples

### Example 1: Basic AS3 Conversion (Recommended)

```javascript
const tmos = require('tmos-converter');

const config = `ltm pool /Common/web_pool {
    members {
        /Common/192.168.1.10:80 { }
        /Common/192.168.1.11:80 { }
    }
}`;

// No options needed - uses defaults (AS3 Classic mode)
const result = await tmos.convertToAS3(config);

console.log(result.declaration);
console.log('Unsupported objects:', result.as3NotConverted);
console.log('Statistics:', result.unsupportedStats);
```

**Output:**
```javascript
{
  declaration: { /* AS3 Classic declaration */ },
  iappSupported: [],
  as3NotConverted: {},
  as3NotRecognized: {},
  keyClassicNotSupported: [],
  renamedDict: {},
  unsupportedStats: {}
}
```

---

### Example 2: AS3 with Debug Controls

```javascript
const tmos = require('tmos-converter');

const config = `ltm virtual /Common/vs_web {
    destination /Common/10.1.1.100:443
    pool /Common/web_pool
    profiles {
        /Common/clientssl { }
        /Common/http { }
    }
}`;

const options = {
  controls: true  // Enable AS3 trace logging
};

const result = await tmos.convertToAS3(config, options);

console.log(result.declaration);
// Declaration will include:
// "controls": { "class": "Controls", "trace": true, "logLevel": "debug" }
```

---

### Example 3: AS3 Cleanup Only (Skip Conversion)

```javascript
const tmos = require('tmos-converter');

// Already have an AS3 declaration with invalid refs
const existingAS3 = {
  class: 'ADC',
  schemaVersion: '3.50.0',
  tenant1: {
    class: 'Tenant',
    app1: {
      class: 'Application',
      web_pool: {
        class: 'Pool',
        monitors: [{ bigip: '/Common/nonexistent_monitor' }]  // Invalid ref
      }
    }
  }
};

const options = {
  skipTMOSConvertProcess: true  // Skip conversion, just cleanup
};

const result = await tmos.toAS3(existingAS3, options);
// Invalid monitor reference will be removed
```

---

### Example 4: Basic DO Conversion

```javascript
const tmos = require('tmos-converter');

const config = `net vlan external {
    tag 100
    interfaces {
        1.1 { }
    }
}
net self 10.1.1.10/24 {
    vlan external
    allow-service all
}`;

// No options needed
const result = tmos.convertToDO(config);

console.log(result);
```

---

### Example 5: DO with Debug Controls

```javascript
const tmos = require('tmos-converter');

const config = `sys ntp {
    servers { 0.pool.ntp.org 1.pool.ntp.org }
    timezone America/Los_Angeles
}`;

const options = {
  controls: true  // Enable DO trace logging
};

const result = tmos.convertToDO(config, options);

console.log(result);
// Declaration will include:
// "controls": {
//   "class": "Controls",
//   "userAgent": "TMOS-CONVERTER/1.0.0",
//   "trace": true,
//   "traceResponse": true,
//   "dryRun": false
// }
```

---

### Example 6: Advanced AS3 with Custom Logging

```javascript
const tmos = require('tmos-converter');

// Custom logging context for audit trail
const auditLog = [];
const requestContext = {
  logSkipTmshProperty: (data) => {
    auditLog.push({ type: 'skip', ...data });
  },
  logRenameProperty: (data) => {
    auditLog.push({ type: 'rename', ...data });
  },
  logRemoveProperty: (data) => {
    auditLog.push({ type: 'remove', ...data });
  },
  logRenamedProperty: (data) => {
    auditLog.push({ type: 'renamed_object', ...data });
  }
};

const config = `ltm pool /Common/192.168.1.10 {
    members {
        /Common/192.168.1.10:80 { }
    }
}`;

const options = {
  jsonLogs: true,        // Enable structured logging
  requestContext         // Custom logging handlers
};

const result = await tmos.convertToAS3(config, options);

// Review all property transformations
console.log('Audit log:', auditLog);
```

---

### Example 7: Two-Step Conversion (Parse + Convert)

```javascript
const tmos = require('tmos-converter');

const config = `ltm monitor http /Common/web_check {
    interval 5
    timeout 16
    send "GET /health HTTP/1.0\\r\\n\\r\\n"
    recv "200 OK"
}`;

// Step 1: Parse TMOS to JSON
const parsed = tmos.parse(config);
console.log('Parsed JSON:', parsed);

// Step 2: Convert to AS3 (with options)
const options = { controls: true };
const result = await tmos.toAS3(parsed, options);

console.log('AS3 Declaration:', result.declaration);
```

---

## Option Validation

The converter **does not validate** options - invalid options are silently ignored. This is by design for forward compatibility.

**Safe Practice:**
```javascript
// These all work (extra options ignored)
await tmos.convertToAS3(config, { controls: true });
await tmos.convertToAS3(config, { controls: true, unknownOption: 'ignored' });
await tmos.convertToAS3(config, {});
await tmos.convertToAS3(config);  // Same as {}
```

---

## Default Values Summary

| Option | Default | AS3 | DO | Notes |
|--------|---------|-----|-----|-------|
| `next` | `false` | ✅ | ❌ | Not supported - always use Classic |
| `controls` | `false` | ✅ | ✅ | Adds debug Controls class |
| `skipTMOSConvertProcess` | `false` | ✅ | ❌ | Cleanup-only mode |
| `jsonLogs` | `false` | ✅ | ❌ | Requires `requestContext` |
| `requestContext` | `undefined` | ✅ | ❌ | Advanced logging |
| `disableAnalytics` | `false` | ✅ | ❌ | No effect (legacy) |

---

## Important Notes

1. **AS3 Next is NOT supported** in this standalone converter. The `next: true` option exists for compatibility but should not be used.

2. **Options are optional** - all functions work with no options:
   ```javascript
   await tmos.convertToAS3(config);  // ✅ Works
   tmos.convertToDO(config);         // ✅ Works
   ```

3. **Unknown options are ignored** - no validation or errors for extra properties

4. **`requestContext` requires `jsonLogs`** - logging methods only called when `jsonLogs: true`

5. **Empty options `{}` is same as no options** - all defaults apply

---

## Source Code References

All options are processed in these key files:

- **AS3 Main:** [src/converters/as3/index.js](src/converters/as3/index.js)
- **DO Main:** [src/converters/do/index.js](src/converters/do/index.js)
- **Declaration Base:** [src/utils/declarationBase.js](src/utils/declarationBase.js)
- **Convert Engine:** [src/converters/as3/engine/converter.js](src/converters/as3/engine/converter.js)
- **Global Object Util:** [src/utils/globalRenameAndSkippedObject.js](src/utils/globalRenameAndSkippedObject.js)

---

**Last Updated:** 2025-11-14
**Version:** 1.0.0
**Maintainer:** See package.json
