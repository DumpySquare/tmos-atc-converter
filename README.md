# TMOS Converter

Convert F5 TMOS configuration to AS3 Classic and Declarative Onboarding declarations.

**Status:** Production ready ✅ | **Tests:** 413 passing | **Version:** 1.0.0

---

## Overview

Standalone library extracted from [f5-automation-config-converter](https://github.com/f5devcentral/f5-automation-config-converter) v1.126.0.

**Features:**

- ✅ Parse TMOS configuration text to JSON
- ✅ Convert to AS3 Classic declarations
- ✅ Convert to Declarative Onboarding (DO) declarations
- ✅ Extract and process UCS archives
- ✅ Handle certificates, iRules, and complex configurations
- ❌ No AS3 NEXT support (intentionally excluded)

---

## Installation

```bash
npm install tmos-converter
```

---

## Quick Start

### Basic AS3 Conversion

```javascript
const tmos = require('tmos-converter');

const config = `
ltm pool /Common/web_pool {
    members {
        /Common/192.168.1.10:80 { }
        /Common/192.168.1.11:80 { }
    }
}
ltm virtual /Common/web_vs {
    destination /Common/192.168.1.100:443
    pool /Common/web_pool
    profiles {
        /Common/http { }
    }
}`;

// Convert to AS3 Classic
const result = await tmos.convertToAS3(config);
console.log(JSON.stringify(result.declaration, null, 2));
```

### Basic DO Conversion

```javascript
const tmos = require('tmos-converter');

const config = `
net vlan external {
    tag 100
    interfaces {
        1.1 { }
    }
}
net self 10.1.1.10/24 {
    vlan external
    allow-service all
}`;

// Convert to DO
const declaration = tmos.convertToDO(config);
console.log(JSON.stringify(declaration, null, 2));
```

---

## API Reference

### parse(configText)

Parse TMOS configuration text to intermediate JSON.

**Parameters:**

- `configText` (string) - TMOS configuration text

**Returns:** Object - Parsed JSON representation

**Example:**

```javascript
const json = tmos.parse(config);
console.log(json);
// {
//   'ltm pool /Common/web_pool': { members: { ... } },
//   'ltm virtual /Common/web_vs': { destination: '...', ... }
// }
```

---

### convertToAS3(configText, [options])

Parse TMOS config and convert directly to AS3 Classic (one-step).

**Parameters:**

- `configText` (string) - TMOS configuration text
- `options` (object, optional) - Conversion options

**Returns:** Promise<Object> - AS3 conversion result

**Example:**

```javascript
const result = await tmos.convertToAS3(config);

// Result structure:
{
  declaration: { /* AS3 Classic declaration */ },
  as3NotConverted: { /* unsupported objects */ },
  as3NotRecognized: { /* unrecognized objects */ },
  keyClassicNotSupported: [ /* unsupported keys */ ],
  renamedDict: { /* renamed objects */ },
  unsupportedStats: { /* statistics */ }
}
```

---

### toAS3(json, [options])

Convert parsed JSON to AS3 Classic declaration (two-step).

**Parameters:**

- `json` (object) - Parsed TMOS JSON (from `parse()`)
- `options` (object, optional) - Conversion options

**Returns:** Promise<Object> - AS3 conversion result

**Example:**

```javascript
const json = tmos.parse(config);
const result = await tmos.toAS3(json, { controls: true });
```

---

### convertToDO(configText, [options])

Parse TMOS config and convert directly to DO (one-step).

**Parameters:**

- `configText` (string) - TMOS configuration text
- `options` (object, optional) - Conversion options

**Returns:** Object - DO declaration

**Example:**

```javascript
const declaration = tmos.convertToDO(config);
```

---

### toDO(json, [options])

Convert parsed JSON to DO declaration (two-step).

**Parameters:**

- `json` (object) - Parsed TMOS JSON (from `parse()`)
- `options` (object, optional) - Conversion options

**Returns:** Object - DO declaration

**Example:**

```javascript
const json = tmos.parse(config);
const declaration = tmos.toDO(json, { controls: true });
```

---

## Configuration Options

### Common Options

```javascript
{
  controls: false  // Add Controls class for debugging (AS3 & DO)
}
```

### AS3-Specific Options

```javascript
{
  controls: false,                // Add AS3 Controls class with trace logging
  skipTMOSConvertProcess: false,  // Skip conversion, run cleanup only
  jsonLogs: false,                // Enable structured JSON logging
  requestContext: { ... }         // Custom logging handlers (advanced)
}
```

**See [OPTIONS.md](OPTIONS.md) for complete options documentation with examples.**

---

## Usage Examples

### Example 1: Virtual Server with Pool

```javascript
const tmos = require('tmos-converter');

const config = `
ltm pool /Common/app_pool {
    load-balancing-mode round-robin
    members {
        /Common/10.0.1.10:8080 { }
        /Common/10.0.1.11:8080 { }
    }
    monitor /Common/http
}
ltm virtual /Common/app_vs {
    destination /Common/10.0.0.100:80
    ip-protocol tcp
    pool /Common/app_pool
    profiles {
        /Common/tcp { }
        /Common/http { }
    }
}`;

const result = await tmos.convertToAS3(config);

// Access the declaration
console.log(result.declaration);

// Check for unsupported objects
if (Object.keys(result.as3NotConverted).length > 0) {
    console.log('Unsupported objects:', result.as3NotConverted);
}

// View statistics
console.log('Stats:', result.unsupportedStats);
```

### Example 2: Network Configuration (DO)

```javascript
const tmos = require('tmos-converter');

const config = `
net vlan internal {
    tag 10
    interfaces {
        1.1 { }
    }
}
net vlan external {
    tag 20
    interfaces {
        1.2 { }
    }
}
net self 10.10.10.10/24 {
    vlan internal
    allow-service default
}
net self 192.168.1.10/24 {
    vlan external
    allow-service none
}
sys ntp {
    servers { 0.pool.ntp.org 1.pool.ntp.org }
    timezone America/Los_Angeles
}`;

const declaration = tmos.convertToDO(config);
console.log(JSON.stringify(declaration, null, 2));
```

### Example 3: Two-Step Conversion with Options

```javascript
const tmos = require('tmos-converter');

// Step 1: Parse
const config = `ltm pool /Common/pool1 { members { /Common/10.0.1.10:80 { } } }`;
const json = tmos.parse(config);

// Inspect parsed JSON
console.log('Parsed:', JSON.stringify(json, null, 2));

// Step 2: Convert with debug controls
const options = {
    controls: true  // Enable AS3 trace logging
};

const result = await tmos.toAS3(json, options);

// Declaration will include debug controls
console.log(result.declaration.controls);
// { class: 'Controls', trace: true, logLevel: 'debug' }
```

### Example 4: Certificate and SSL Profile

```javascript
const tmos = require('tmos-converter');

const config = `
sys file ssl-cert /Common/example.crt {
    source-path file:/var/config/rest/downloads/example.crt
}
sys file ssl-key /Common/example.key {
    source-path file:/var/config/rest/downloads/example.key
}
ltm profile client-ssl /Common/example_ssl {
    cert /Common/example.crt
    key /Common/example.key
}
ltm virtual /Common/https_vs {
    destination /Common/10.0.0.100:443
    profiles {
        /Common/example_ssl { context clientside }
        /Common/tcp { }
    }
}`;

const result = await tmos.convertToAS3(config);
console.log(result.declaration);
```

### Example 5: iRule Conversion

```javascript
const tmos = require('tmos-converter');

const config = `
ltm rule /Common/redirect_rule {
when HTTP_REQUEST {
    if { [HTTP::uri] starts_with "/old" } {
        HTTP::redirect "https://[HTTP::host]/new[HTTP::uri]"
    }
}
}
ltm virtual /Common/web_vs {
    destination /Common/10.0.0.100:80
    rules { /Common/redirect_rule }
}`;

const result = await tmos.convertToAS3(config);

// iRules are included in the declaration
console.log(result.declaration);
```

---

## Advanced Usage

### Custom Logging (AS3 only)

```javascript
const tmos = require('tmos-converter');

// Create audit log
const auditLog = [];
const requestContext = {
    logSkipTmshProperty: (data) => auditLog.push({ type: 'skip', ...data }),
    logRenameProperty: (data) => auditLog.push({ type: 'rename', ...data }),
    logRemoveProperty: (data) => auditLog.push({ type: 'remove', ...data }),
    logRenamedProperty: (data) => auditLog.push({ type: 'renamed_object', ...data })
};

const result = await tmos.convertToAS3(config, {
    jsonLogs: true,
    requestContext
});

// Review all transformations
console.log('Audit trail:', auditLog);
```

### Handling Conversion Results

```javascript
const tmos = require('tmos-converter');

const result = await tmos.convertToAS3(config);

// Check what was converted
console.log('Converted successfully:', Object.keys(result.declaration));

// Objects that couldn't be converted
if (Object.keys(result.as3NotConverted).length > 0) {
    console.warn('Unsupported objects:');
    Object.keys(result.as3NotConverted).forEach(key => {
        console.warn(`  - ${key}`);
    });
}

// Objects that weren't recognized at all
if (Object.keys(result.as3NotRecognized).length > 0) {
    console.error('Unrecognized objects:');
    Object.keys(result.as3NotRecognized).forEach(key => {
        console.error(`  - ${key}`);
    });
}

// View conversion statistics
console.log('\nConversion statistics:');
Object.entries(result.unsupportedStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} objects`);
});

// Objects that were renamed to avoid conflicts
if (Object.keys(result.renamedDict).length > 0) {
    console.log('\nRenamed objects:');
    Object.entries(result.renamedDict).forEach(([newName, oldName]) => {
        console.log(`  ${oldName} -> ${newName}`);
    });
}
```

---

## Testing

```bash
# Run all tests
npm test                # 413 passing (28s)

# Run upstream compatibility tests (if available)
npm run test:upstream
```

**Test Coverage:**

- ✅ Parser: 18 tests
- ✅ AS3 converter: 304 tests
- ✅ DO converter: 63 tests
- ✅ AS3 cleanup: 8 tests
- ✅ Validators: 4 tests
- ✅ Basic API: 9 tests
- ✅ Cleanup scripts: 7 tests

**Total: 413/413 passing (100% pass rate)**

---

## Documentation

- **[README.md](README.md)** (this file) - Main documentation
- **[OPTIONS.md](OPTIONS.md)** - Complete API options reference with examples
- **[EXTRACTION_STATUS.md](EXTRACTION_STATUS.md)** - Project status and statistics
- **[UPSTREAM_SYNC.md](UPSTREAM_SYNC.md)** - Upstream synchronization strategy
- **[EXTRACTION_PLAN.md](EXTRACTION_PLAN.md)** - Original extraction plan (historical)

---

## Project Status

- **Version:** 1.0.0
- **Source:** f5-automation-config-converter v1.126.0
- **Tests:** 413/413 passing (100%)
- **Status:** Production ready ✅
- **Last Updated:** 2025-11-14

See [EXTRACTION_STATUS.md](EXTRACTION_STATUS.md) for complete extraction details.

---

## Differences from Original f5-acc

### Removed Features

- ❌ AS3 NEXT conversion (use AS3 Classic only)
- ❌ HTTP server and REST API
- ❌ CLI tool (library-only)
- ❌ Analytics/telemetry
- ❌ Complex logging infrastructure

### Kept Features

- ✅ All core conversion logic
- ✅ AS3 Classic support (full)
- ✅ DO support (full)
- ✅ UCS archive extraction
- ✅ Certificate handling
- ✅ iRule conversion
- ✅ Policy conversion
- ✅ Profile conversion
- ✅ All TMOS object types

### Improvements

- ✅ Simpler API
- ✅ Fewer dependencies (8 runtime, 5 dev)
- ✅ Smaller package size (<2MB)
- ✅ Better organized code structure
- ✅ Comprehensive documentation

---

## Known Limitations

1. **AS3 NEXT not supported** - Only AS3 Classic is supported (intentional)
2. **No HTTP server** - Use programmatic API only
3. **No CLI** - Can be added later if needed
4. **Some `config.next` conditionals remain** - Cosmetic only, safely ignored

---

## Source Attribution

- **Original Project:** [f5-automation-config-converter](https://github.com/f5devcentral/f5-automation-config-converter)
- **Version:** 1.126.0
- **Commit:** 05b0737713ef54caaf20da09524d10fa8a4ee86d
- **License:** Apache-2.0
- **Extraction Date:** 2025-11-13

This project maintains the same Apache-2.0 license as the original. See [UPSTREAM_SYNC.md](UPSTREAM_SYNC.md) for sync history and [EXTRACTION_PLAN.md](EXTRACTION_PLAN.md) for extraction methodology.

---

## Contributing

Contributions welcome! See [EXTRACTION_STATUS.md](EXTRACTION_STATUS.md#-optional-future-work) for suggested improvements.

**Priority areas:**

1. Documentation improvements
2. Additional usage examples
3. Edge case testing
4. Performance optimization

---

## Maintenance

### Upstream Synchronization

This project tracks upstream f5-acc releases quarterly. See [UPSTREAM_SYNC.md](UPSTREAM_SYNC.md) for:

- Sync process
- Component mapping
- Known modifications
- Test-based change detection

**Next sync:** 2026-02-14

---

## Support

- **Issues:** Open an issue for bugs or feature requests
- **Documentation:** See docs listed above
- **Upstream:** For f5-acc bugs, report at the [original repository](https://github.com/f5devcentral/f5-automation-config-converter/issues)

---

## License

Apache-2.0 - Same as original [f5-automation-config-converter](https://github.com/f5devcentral/f5-automation-config-converter)

Copyright 2024 F5, Inc.
