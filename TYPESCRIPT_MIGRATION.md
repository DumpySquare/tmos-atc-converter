# TypeScript Migration Tracking

This document tracks the progress of converting the codebase from JavaScript to TypeScript.

## Migration Strategy

1. **Setup Phase**: Configure TypeScript with strict mode, install dependencies
2. **Entry Point**: Convert `index.js` → `src/index.ts` first
3. **Bottom-Up**: Convert utility files first (fewer dependencies)
4. **Converters**: Convert map files, then engine, then main converters
5. **Types**: Create shared type definitions as patterns emerge

## Configuration

- **Strict Mode**: Full strict mode enabled
- **Output**: Compiled to `dist/` directory
- **Tests**: Use `ts-node` for real-time compilation during testing
- **Source Maps**: Enabled for debugging

## File Conversion Status

### Legend

- [ ] Not started
- [~] In progress
- [x] Completed

---

### Root (1 file)

| File | Status | Notes |
|------|--------|-------|
| `index.js` → `src/index.ts` | [x] | Main entry point, moved to src |

---

### Core (`src/`) (2 files)

| File | Status | Notes |
|------|--------|-------|
| `constants.js` → `constants.ts` | [x] | Simple constants, converted with interfaces |

---

### Validators (`src/validators/`) (1 file)

| File | Status | Notes |
|------|--------|-------|
| `as3.js` | [ ] | AS3 schema validation |

---

### Parser (`src/parser/`) (7 files)

| File | Status | Notes |
|------|--------|-------|
| `index.js` | [ ] | Main parser entry |
| `utils/arrToMultilineStr.js` | [ ] | Array to string utility |
| `utils/countIndent.js` | [ ] | Indentation counter |
| `utils/getTitle.js` | [ ] | Title extraction |
| `utils/objToArr.js` | [ ] | Object to array conversion |
| `utils/removeIndent.js` | [ ] | Indentation removal |
| `utils/strToObj.js` | [ ] | String to object parsing |

---

### Utilities (`src/utils/`) (33 files)

| File | Status | Notes |
|------|--------|-------|
| `buildProtectedObj.js` | [ ] | |
| `cleanupRD.js` | [ ] | Route domain cleanup |
| `convertToNameValueObj.js` | [ ] | |
| `convertToNumberArray.js` | [ ] | |
| `countObjects.js` | [ ] | |
| `declarationBase.js` | [ ] | AS3/DO declaration templates |
| `dedupeArray.js` → `dedupeArray.ts` | [x] | |
| `deleteProperties.js` | [ ] | |
| `enabledToEnable.js` → `enabledToEnable.ts` | [x] | |
| `filterConf.js` | [ ] | Configuration filtering |
| `findLocation.js` | [ ] | |
| `formatStr.js` → `formatStr.ts` | [x] | |
| `getBigipVersion.js` | [ ] | |
| `getKey.js` → `getKey.ts` | [x] | |
| `getObjectType.js` | [ ] | |
| `globalRenameAndSkippedObject.js` | [ ] | |
| `handleObjectRef.js` | [ ] | Object reference handling |
| `hyphensToCamel.js` → `hyphensToCamel.ts` | [x] | |
| `ipUtils.js` | [ ] | IP address utilities |
| `isNumber.js` → `isNumber.ts` | [x] | |
| `loadCertsAndKeys.js` | [ ] | Certificate loading |
| `loadDeviceCert.js` | [ ] | |
| `log.js` | [ ] | Winston logger wrapper |
| `object.js` | [ ] | Object manipulation |
| `parseNestedString.js` | [ ] | |
| `prependObjProps.js` | [ ] | |
| `recursiveCamelize.js` | [ ] | |
| `renameProperties.js` | [ ] | |
| `returnEmptyObjIfNone.js` → `returnEmptyObjIfNone.ts` | [x] | |
| `string.js` | [ ] | String utilities |
| `traverseJSON.js` | [ ] | JSON traversal |
| `unquote.js` → `unquote.ts` | [x] | |

---

### I/O (`src/io/`) (2 files)

| File | Status | Notes |
|------|--------|-------|
| `inputReader.js` | [ ] | Various input format handling |
| `ucsReader.js` | [ ] | UCS archive extraction |

---

### AS3 Converter (`src/converters/as3/`) (4 files)

| File | Status | Notes |
|------|--------|-------|
| `index.js` | [ ] | Main AS3 converter entry |
| `cleanup.js` | [ ] | AS3 declaration cleanup |
| `dict.js` | [ ] | Property dictionaries |
| `properties.js` | [ ] | Property mappings |

---

### AS3 Engine (`src/converters/as3/engine/`) (4 files)

| File | Status | Notes |
|------|--------|-------|
| `index.js` | [ ] | Engine entry point |
| `converter.js` | [ ] | Core conversion logic |
| `defaultActions.js` | [ ] | Default conversion actions |
| `publicActions.js` | [ ] | Public conversion actions |

---

### AS3 Maps (`src/converters/as3/maps/`) (21 files)

| File | Status | Notes |
|------|--------|-------|
| `certificate.js` | [ ] | SSL certificate mappings |
| `cipher.js` | [ ] | Cipher configuration |
| `data_group.js` | [ ] | Data group mappings |
| `dns.js` | [ ] | DNS configuration |
| `enforcement.js` | [ ] | PEM enforcement |
| `firewall.js` | [ ] | AFM firewall rules |
| `gslb.js` | [ ] | Global server load balancing |
| `html_rule.js` | [ ] | HTML profile rules |
| `iapp.js` | [ ] | iApp templates |
| `irule.js` | [ ] | iRule mappings |
| `log_config.js` | [ ] | Logging configuration |
| `monitor.js` | [ ] | Health monitors |
| `network.js` | [ ] | Network configuration |
| `persist.js` | [ ] | Persistence profiles |
| `policy.js` | [ ] | LTM policies |
| `pool.js` | [ ] | Pool configuration |
| `profile.js` | [ ] | Various profiles |
| `security.js` | [ ] | Security policies |
| `service.js` | [ ] | Virtual server services |
| `service_address.js` | [ ] | Service addresses |
| `snat_pool.js` | [ ] | SNAT pool configuration |

---

### DO Converter (`src/converters/do/`) (2 files)

| File | Status | Notes |
|------|--------|-------|
| `index.js` | [ ] | Main DO converter entry |
| `maps/doCustomMaps.js` | [ ] | DO-specific mappings |

---

## Type Definitions to Create

As we convert files, we'll identify shared types. Track them here:

| Type | File | Description | Status |
|------|------|-------------|--------|
| `TMOSConfig` | `src/types/tmos.ts` | Parsed TMOS configuration | [ ] |
| `AS3Declaration` | `src/types/as3.ts` | AS3 Classic declaration | [ ] |
| `DODeclaration` | `src/types/do.ts` | DO declaration | [ ] |
| `ConversionOptions` | `src/types/options.ts` | Converter options | [ ] |
| `ConversionResult` | `src/types/result.ts` | Conversion output with metadata | [ ] |

---

## Progress Summary

| Category | Total | Completed | Percentage |
|----------|-------|-----------|------------|
| Root | 1 | 1 | 100% |
| Core | 1 | 1 | 100% |
| Validators | 1 | 0 | 0% |
| Parser | 7 | 0 | 0% |
| Utilities | 33 | 8 | 24% |
| I/O | 2 | 0 | 0% |
| AS3 Converter | 4 | 0 | 0% |
| AS3 Engine | 4 | 0 | 0% |
| AS3 Maps | 21 | 0 | 0% |
| DO Converter | 2 | 0 | 0% |
| **Total** | **76** | **10** | **13%** |

---

## Notes

### Dependencies Requiring Type Definitions

- `lodash` - `@types/lodash` available
- `winston` - Has built-in types
- `ajv` - Has built-in types
- `deepmerge` - Has built-in types
- `tar` - `@types/tar` available
- `@automation-toolchain/f5-appsvcs-classic-schema` - May need custom types
- `@automation-toolchain/f5-do` - May need custom types

### Recommended Conversion Order

1. `src/constants.ts` - Simple, no dependencies
2. `src/utils/` - Bottom-up, starting with leaf utilities
3. `src/parser/utils/` - Parser utilities
4. `src/parser/index.ts` - Parser main
5. `src/validators/as3.ts` - Schema validation
6. `src/io/` - I/O handlers
7. `src/converters/as3/maps/` - Conversion maps
8. `src/converters/as3/engine/` - Conversion engine
9. `src/converters/as3/` - AS3 converter main
10. `src/converters/do/` - DO converter
11. `src/index.ts` - Main entry point (move from root)

### Known Challenges

- Many files use dynamic property access (`obj[key]`)
- Some functions accept very flexible input types
- External schema packages may lack TypeScript definitions
