# tmos-atc-converter

Convert F5 TMOS configuration to AS3 Classic and Declarative Onboarding declarations.

---

## Features

- Parse TMOS configuration text to JSON
- Convert to AS3 Classic declarations
- Convert to Declarative Onboarding (DO) declarations
- Validate AS3 and DO declarations against schemas
- Extract and process UCS archives
- Handle certificates, iRules, and complex configurations

---

## Installation

```bash
npm install tmos-atc-converter
```

---

## Quick Start

### Basic AS3 Conversion

```javascript
const tmos = require('tmos-atc-converter');

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
const tmos = require('tmos-atc-converter');

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

### validateAS3(declaration, [options])

Validate an AS3 declaration against the AS3 Classic schema.

**Parameters:**

- `declaration` (object) - AS3 declaration to validate
- `options` (object, optional) - `{ mode: 'lazy' | 'strict' }`
  - `lazy` (default): Removes invalid properties and returns cleaned declaration
  - `strict`: Fails on first validation error

**Returns:** Promise - `{ isValid, data, errors, ignoredAttributes }`

**Example:**

```javascript
const result = await tmos.validateAS3(declaration);
if (!result.isValid) {
    console.error('Validation errors:', result.errors);
    console.error('Removed properties:', result.ignoredAttributes);
}

// Strict mode - fail on any error
const strictResult = await tmos.validateAS3(declaration, { mode: 'strict' });
```

---

### validateDO(declaration)

Validate a DO declaration against the Declarative Onboarding schema.

**Parameters:**

- `declaration` (object) - DO declaration to validate

**Returns:** Promise - `{ isValid, errors }`

**Example:**

```javascript
const result = await tmos.validateDO(declaration);
if (!result.isValid) {
    console.error('Validation errors:', result.errors);
}
```

---

### getAS3SchemaVersion()

Get AS3 schema version information.

**Returns:** Object - `{ latest, earliest }`

**Example:**

```javascript
const versions = tmos.getAS3SchemaVersion();
console.log(`Schema: ${versions.latest}`); // e.g., "3.52.0"
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
  stripRouteDomains: false,       // Remove %RD suffixes from IPs
  jsonLogs: false,                // Enable structured JSON logging
  requestContext: { ... }         // Custom logging handlers (advanced)
}
```

**TypeScript users:** All options are fully typed with JSDoc comments. See `AS3ConversionOptions` and `DOConversionOptions` types for IDE intellisense.

---

## Testing

```bash
npm test
```

---

## License

Apache-2.0
