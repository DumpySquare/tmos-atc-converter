# TMOS Converter

Convert F5 TMOS configuration to AS3 Classic and Declarative Onboarding declarations.

## Overview

Extracted core conversion engines from [f5-automation-config-converter](https://github.com/f5devcentral/f5-automation-config-converter) v1.126.0 for standalone use.

**Features:**
- ✅ Parse TMOS configuration text to JSON
- ✅ Convert to AS3 Classic declarations
- ✅ Convert to Declarative Onboarding (DO) declarations
- ✅ Extract and process UCS archives
- ✅ Handle certificates, iRules, and complex configurations
- ❌ No AS3 NEXT support (intentionally excluded)

## Installation

```bash
npm install tmos-converter
```

## Quick Start

```javascript
const tmos = require('tmos-converter');

// TMOS configuration text
const config = `
ltm pool /Common/web_pool {
    members {
        /Common/192.168.1.10:80 {
            address 192.168.1.10
        }
    }
}
ltm virtual /Common/web_vs {
    destination /Common/192.168.1.100:443
    pool /Common/web_pool
}
`;

// Convert to AS3
const result = await tmos.convertToAS3(config);
console.log(JSON.stringify(result.declaration, null, 2));
```

## API

### parse(configText)

Parse TMOS configuration to intermediate JSON.

```javascript
const json = tmos.parse(configText);
```

### toAS3(json, [options])

Convert parsed JSON to AS3 Classic declaration.

```javascript
const result = await tmos.toAS3(json, {
    // options
});
```

Returns:
```javascript
{
    declaration: { /* AS3 Classic declaration */ },
    as3Converted: { /* converted objects */ },
    as3NotConverted: { /* unsupported objects */ },
    as3NotRecognized: { /* unrecognized objects */ },
    renamedDict: { /* renamed objects */ },
    unsupportedStats: { /* statistics */ }
}
```

### toDO(json, [options])

Convert parsed JSON to DO declaration.

```javascript
const declaration = tmos.toDO(json, {
    // options
});
```

### convertToAS3(configText, [options])

Parse and convert in one step.

```javascript
const result = await tmos.convertToAS3(configText);
```

### convertToDO(configText, [options])

Parse and convert to DO in one step.

```javascript
const declaration = tmos.convertToDO(configText);
```

## Options

```javascript
{
    declarativeOnboarding: false,  // Convert to DO instead of AS3
    safeMode: false,               // Skip post-processing
    showExtended: false,           // Include default values
    vsName: null,                  // Filter by virtual server name
    // ... see source for full options
}
```

## Source Attribution

- **Original Project:** [f5-automation-config-converter](https://github.com/f5devcentral/f5-automation-config-converter)
- **Version:** 1.126.0
- **License:** Apache-2.0
- **Extraction Date:** 2025-11-13

See [UPSTREAM_SYNC.md](UPSTREAM_SYNC.md) for sync history with upstream project.

## Differences from Original

**Removed:**
- AS3 NEXT conversion (use AS3 Classic only)
- HTTP server and REST API
- CLI tool (library only)
- Analytics/telemetry
- Complex logging (use console)

**Kept:**
- All core conversion logic
- AS3 Classic support
- DO support
- UCS archive extraction
- Certificate handling

## Testing

```bash
# Run all tests
npm test

# Run upstream compatibility tests
npm run test:upstream
```

## License

Apache-2.0 (same as original f5-automation-config-converter)
