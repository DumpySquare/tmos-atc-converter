# MCP Server Integration Guide

This guide covers how to integrate tmos-atc-converter into an MCP (Model Context Protocol) server for AI-assisted F5 BIG-IP configuration management.

## Use Cases

1. **Convert TMOS configs** - AI extracts config from BIG-IP, converts to AS3/DO
2. **Validate AI changes** - Validate declarations after AI modifications
3. **Iterative refinement** - AI modifies declaration, validates, fixes errors, repeats

## Installation

```bash
npm install tmos-atc-converter
```

## Core Functions for MCP

```typescript
import * as tmos from 'tmos-atc-converter';

// Conversion
await tmos.convertToAS3(config, options);  // TMOS → AS3
tmos.convertToDO(config, options);         // TMOS → DO

// Validation (key for AI workflows)
await tmos.validateAS3(declaration, { mode: 'strict' });  // Fail on errors
await tmos.validateAS3(declaration, { mode: 'lazy' });    // Auto-fix errors
await tmos.validateDO(declaration);

// Schema info
tmos.getAS3SchemaVersion();  // { latest: "3.52.0", earliest: "3.0.0" }
```

## MCP Tool Definitions

### Tool 1: Convert TMOS to AS3

```typescript
const convertToAS3Tool = {
    name: 'convert_tmos_to_as3',
    description: 'Convert F5 TMOS configuration to AS3 Classic declaration',
    inputSchema: {
        type: 'object',
        properties: {
            config: {
                type: 'string',
                description: 'TMOS configuration text (bigip.conf format)'
            },
            stripRouteDomains: {
                type: 'boolean',
                description: 'Remove route domain suffixes from IPs',
                default: false
            }
        },
        required: ['config']
    },
    handler: async ({ config, stripRouteDomains }) => {
        const result = await tmos.convertToAS3(config, { stripRouteDomains });
        return {
            declaration: result.declaration,
            unsupported: result.as3NotConverted,
            warnings: result.keyClassicNotSupported
        };
    }
};
```

### Tool 2: Validate AS3 Declaration

```typescript
const validateAS3Tool = {
    name: 'validate_as3',
    description: 'Validate an AS3 declaration against the schema. Use after making changes.',
    inputSchema: {
        type: 'object',
        properties: {
            declaration: {
                type: 'object',
                description: 'AS3 declaration to validate'
            },
            strict: {
                type: 'boolean',
                description: 'Fail on first error (true) or auto-fix invalid properties (false)',
                default: true
            }
        },
        required: ['declaration']
    },
    handler: async ({ declaration, strict = true }) => {
        const mode = strict ? 'strict' : 'lazy';
        const result = await tmos.validateAS3(declaration, { mode });

        if (result.isValid) {
            return {
                valid: true,
                declaration: result.data,
                message: 'Declaration is valid'
            };
        }

        return {
            valid: false,
            errors: result.errors.map(e => ({
                path: e.dataPath || e.instancePath,
                message: e.message,
                keyword: e.keyword
            })),
            // In lazy mode, return the cleaned declaration
            ...(mode === 'lazy' && {
                cleanedDeclaration: result.data,
                removedProperties: result.ignoredAttributes
            })
        };
    }
};
```

### Tool 3: Validate DO Declaration

```typescript
const validateDOTool = {
    name: 'validate_do',
    description: 'Validate a DO declaration against the schema',
    inputSchema: {
        type: 'object',
        properties: {
            declaration: {
                type: 'object',
                description: 'DO declaration to validate'
            }
        },
        required: ['declaration']
    },
    handler: async ({ declaration }) => {
        const result = await tmos.validateDO(declaration);

        if (result.isValid) {
            return { valid: true, message: 'Declaration is valid' };
        }

        return {
            valid: false,
            errors: result.errors?.map(e => ({
                path: e.dataPath || e.instancePath,
                message: e.message,
                keyword: e.keyword
            }))
        };
    }
};
```

## Validation Strategies

### Strategy 1: Strict Validation (Recommended for AI)

Use strict mode to get immediate feedback on errors:

```typescript
const result = await tmos.validateAS3(declaration, { mode: 'strict' });

if (!result.isValid) {
    // Return errors to AI for correction
    return {
        error: 'Invalid declaration',
        errors: result.errors,
        hint: 'Fix these errors and try again'
    };
}
```

### Strategy 2: Auto-Fix with Lazy Mode

Use lazy mode to automatically remove invalid properties:

```typescript
const result = await tmos.validateAS3(declaration, { mode: 'lazy' });

// result.data contains the cleaned declaration
// result.ignoredAttributes lists what was removed

if (result.ignoredAttributes?.length > 0) {
    return {
        declaration: result.data,
        warning: `Removed invalid properties: ${result.ignoredAttributes.join(', ')}`
    };
}
```

### Strategy 3: Validate-Fix Loop

Let AI iterate until valid:

```typescript
async function validateAndFix(declaration, maxAttempts = 3) {
    for (let i = 0; i < maxAttempts; i++) {
        const result = await tmos.validateAS3(declaration, { mode: 'strict' });

        if (result.isValid) {
            return { success: true, declaration: result.data };
        }

        // Return to AI with error context
        // AI modifies declaration based on errors
        // Next iteration validates the fix
    }

    return { success: false, errors: result.errors };
}
```

## Common AI Workflows

### Workflow 1: Config Migration

```
1. User provides TMOS config (bigip.conf extract)
2. AI calls convert_tmos_to_as3
3. AI reviews result.unsupported for manual handling
4. AI modifies declaration as needed
5. AI calls validate_as3 (strict mode)
6. If errors, AI fixes and re-validates
7. Return final declaration to user
```

### Workflow 2: Declaration Modification

```
1. User provides existing AS3 declaration
2. User requests changes (add pool member, change monitor, etc.)
3. AI modifies the declaration JSON
4. AI calls validate_as3 (strict mode)
5. If errors, AI fixes based on error messages
6. Return modified declaration
```

### Workflow 3: Template Generation

```
1. User describes desired configuration
2. AI generates AS3 declaration from scratch
3. AI calls validate_as3 (strict mode)
4. AI iterates until valid
5. Return validated declaration
```

## Error Handling Best Practices

### Provide Context in Errors

```typescript
const result = await tmos.validateAS3(declaration, { mode: 'strict' });

if (!result.isValid) {
    const errorContext = result.errors.map(e => {
        const path = e.dataPath || e.instancePath || 'root';
        return `- ${path}: ${e.message} (${e.keyword})`;
    }).join('\n');

    return {
        error: `Declaration validation failed:\n${errorContext}`,
        suggestion: 'Review the AS3 schema documentation for valid property values'
    };
}
```

### Handle Schema Version Mismatches

```typescript
const versions = tmos.getAS3SchemaVersion();

// Check if declaration schema version is supported
const declVersion = declaration.schemaVersion;
if (declVersion && declVersion < versions.earliest) {
    return {
        warning: `Schema version ${declVersion} is older than supported (${versions.earliest}). Consider updating.`
    };
}
```

## Type Safety (TypeScript)

```typescript
import * as tmos from 'tmos-atc-converter';
import type {
    AS3ConversionOptions,
    AS3ConversionResult,
    AS3ValidationOptions,
    AS3ValidationResult,
    DOValidationResult,
    ValidationError
} from 'tmos-atc-converter';

// Full type safety for options and results
const options: AS3ValidationOptions = { mode: 'strict' };
const result: AS3ValidationResult = await tmos.validateAS3(declaration, options);

// Type-safe error handling
if (!result.isValid) {
    result.errors.forEach((error: ValidationError) => {
        console.log(`${error.dataPath}: ${error.message}`);
    });
}
```

## Performance Considerations

1. **Validator caching** - Validators are singletons, schema compiled once
2. **Lazy mode overhead** - Iteratively removes properties, slower than strict
3. **Large declarations** - Validation time scales with declaration size

For high-throughput scenarios:

```typescript
// Prefer strict mode for faster fail-fast validation
const result = await tmos.validateAS3(declaration, { mode: 'strict' });

// Only use lazy mode when you want auto-cleanup
const cleaned = await tmos.validateAS3(declaration, { mode: 'lazy' });
```

## Example: Complete MCP Server

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as tmos from 'tmos-atc-converter';

const server = new Server({
    name: 'f5-config-server',
    version: '1.0.0'
});

server.setRequestHandler('tools/list', async () => ({
    tools: [
        {
            name: 'convert_tmos_to_as3',
            description: 'Convert TMOS config to AS3 declaration',
            inputSchema: { /* ... */ }
        },
        {
            name: 'validate_as3',
            description: 'Validate AS3 declaration',
            inputSchema: { /* ... */ }
        },
        {
            name: 'validate_do',
            description: 'Validate DO declaration',
            inputSchema: { /* ... */ }
        }
    ]
}));

server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
        case 'convert_tmos_to_as3':
            return handleConvert(args);
        case 'validate_as3':
            return handleValidateAS3(args);
        case 'validate_do':
            return handleValidateDO(args);
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

async function handleValidateAS3({ declaration, strict = true }) {
    const result = await tmos.validateAS3(declaration, {
        mode: strict ? 'strict' : 'lazy'
    });

    return {
        content: [{
            type: 'text',
            text: JSON.stringify({
                valid: result.isValid,
                ...(result.isValid ? {} : { errors: result.errors }),
                ...(result.ignoredAttributes?.length ? {
                    removed: result.ignoredAttributes
                } : {})
            }, null, 2)
        }]
    };
}
```

## Future: Application-Level Conversion

> **Note:** This section describes planned functionality that requires integration with [f5-corkscrew](https://github.com/f5devcentral/f5-corkscrew).

### The Problem

BIG-IP configs typically contain many applications. The current API converts the entire config at once, which:

- Produces large AS3 declarations with all apps
- Makes it hard for AI to work with individual applications
- Requires manual extraction of specific apps from the output

### The Solution

Integration with f5-corkscrew will enable application-level extraction and conversion:

```typescript
// Future API (planned)
import * as tmos from 'tmos-atc-converter';

// List all applications in a config
const apps = await tmos.listApplications(config);
// Returns: ["/Common/app1_vs", "/Common/app2_vs", "/Prod/web_vs", ...]

// Extract and convert a single application
const result = await tmos.convertAppToAS3(config, "/Common/app1_vs", options);
// Returns: AS3 declaration containing only app1_vs and its dependencies
```

### Application Extraction

An "application" in TMOS is anchored by a virtual server and includes all its dependencies:

```
Virtual Server (/Common/app1_vs)
├── destination (10.1.1.100:443)
├── pool (/Common/app1_pool)
│   ├── members (10.2.1.10:8080, 10.2.1.11:8080)
│   │   └── nodes (/Common/server1, /Common/server2)
│   └── monitors (/Common/app1_http_monitor)
├── profiles
│   ├── client-ssl (/Common/app1_clientssl)
│   ├── server-ssl (/Common/app1_serverssl)
│   ├── http (/Common/http)
│   └── tcp (/Common/tcp-wan-optimized)
├── rules (/Common/app1_irule)
│   └── referenced pools in iRule code
├── policies (/Common/app1_policy)
│   └── referenced pools in policy rules
├── snat (/Common/app1_snatpool)
│   └── snatpool members
└── persistence (/Common/cookie_persist)
```

### Future MCP Tools

```typescript
// Tool: List applications in config
const listAppsTool = {
    name: 'list_tmos_applications',
    description: 'List all applications (virtual servers) in a TMOS config',
    inputSchema: {
        type: 'object',
        properties: {
            config: {
                type: 'string',
                description: 'TMOS configuration text'
            }
        },
        required: ['config']
    },
    handler: async ({ config }) => {
        const apps = await tmos.listApplications(config);
        return {
            applications: apps.map(app => ({
                name: app.name,
                partition: app.partition,
                destination: app.destination,
                features: app.features  // SSL, WAF, APM, iRules, etc.
            }))
        };
    }
};

// Tool: Convert single application
const convertAppTool = {
    name: 'convert_tmos_app_to_as3',
    description: 'Convert a single application from TMOS config to AS3',
    inputSchema: {
        type: 'object',
        properties: {
            config: {
                type: 'string',
                description: 'TMOS configuration text'
            },
            appName: {
                type: 'string',
                description: 'Full path to virtual server (e.g., /Common/my_app_vs)'
            },
            stripRouteDomains: {
                type: 'boolean',
                default: false
            }
        },
        required: ['config', 'appName']
    },
    handler: async ({ config, appName, stripRouteDomains }) => {
        const result = await tmos.convertAppToAS3(config, appName, { stripRouteDomains });
        return {
            declaration: result.declaration,
            includedObjects: result.dependencies,
            unsupported: result.unsupported
        };
    }
};
```

### Feature Detection (Planned)

Application-level extraction will include feature detection:

```typescript
const apps = await tmos.listApplications(config);

// Each app includes detected features
apps[0].features = {
    ssl: {
        clientSsl: true,
        serverSsl: true,
        certificates: ['/Common/app1.crt']
    },
    waf: {
        asmPolicy: '/Common/app1_waf_policy'
    },
    accessControl: {
        apmProfile: null
    },
    loadBalancing: {
        method: 'round-robin',
        persistence: 'cookie',
        healthMonitors: ['http', 'tcp']
    },
    customization: {
        iRules: ['/Common/app1_irule'],
        policies: ['/Common/app1_policy'],
        complexity: 'medium'  // simple, medium, complex
    }
};
```

This enables AI to:

1. List all apps and their features
2. Identify complex apps that may need manual review
3. Convert apps one at a time
4. Focus on specific features (e.g., "convert all apps with WAF policies")

### Architecture

The planned architecture separates concerns across projects:

```text
tmos-parser (extracted from tmos-atc-converter)
    │
    │  TMOS text → JSON
    ↓
f5-corkscrew
    │  • App extraction (TmosApp bundles)
    │  • Feature detection
    │  • Complexity scoring
    ↓
tmos-atc-converter
    │  • convertAppToAS3(tmosApp)
    │  • convertAppToDO(tmosApp)
    │  • validateAS3/validateDO
    ↓
AS3/DO declarations
```

### Ideal MCP Workflow

```text
1. User provides full bigip.conf
2. AI calls list_tmos_applications
3. AI presents app list with features to user
4. User selects apps to convert (or "all")
5. For each selected app:
   a. AI calls convert_tmos_app_to_as3
   b. AI reviews unsupported features
   c. AI calls validate_as3
   d. If errors, AI fixes and re-validates
6. Return individual AS3 declarations per app
```

This approach is essential for large configs where converting everything at once is impractical.

## See Also

- [README.md](README.md) - Full API documentation
- [src/types.ts](src/types.ts) - TypeScript type definitions
- [f5-corkscrew](https://github.com/f5devcentral/f5-corkscrew) - TMOS config parsing and app extraction
- [AS3 Schema Reference](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/refguide/schema-reference.html)
- [DO Schema Reference](https://clouddocs.f5.com/products/extensions/f5-declarative-onboarding/latest/schema-reference.html)
