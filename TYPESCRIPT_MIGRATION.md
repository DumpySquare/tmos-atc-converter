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
| `as3.js` → `as3.ts` | [x] | AS3 schema validation |

---

### Parser (`src/parser/`) (7 files)

| File | Status | Notes |
|------|--------|-------|
| `index.js` → `index.ts` | [x] | Main parser entry |
| `utils/arrToMultilineStr.js` → `arrToMultilineStr.ts` | [x] | Array to string utility |
| `utils/countIndent.js` → `countIndent.ts` | [x] | Indentation counter |
| `utils/getTitle.js` → `getTitle.ts` | [x] | Title extraction |
| `utils/objToArr.js` → `objToArr.ts` | [x] | Object to array conversion |
| `utils/removeIndent.js` → `removeIndent.ts` | [x] | Indentation removal |
| `utils/strToObj.js` → `strToObj.ts` | [x] | String to object parsing |

---

### Utilities (`src/utils/`) (33 files)

| File | Status | Notes |
|------|--------|-------|
| `buildProtectedObj.js` → `buildProtectedObj.ts` | [x] | |
| `cleanupRD.js` → `cleanupRD.ts` | [x] | Route domain cleanup |
| `convertToNameValueObj.js` → `convertToNameValueObj.ts` | [x] | |
| `convertToNumberArray.js` → `convertToNumberArray.ts` | [x] | |
| `countObjects.js` → `countObjects.ts` | [x] | |
| `declarationBase.js` → `declarationBase.ts` | [x] | AS3/DO declaration templates |
| `dedupeArray.js` → `dedupeArray.ts` | [x] | |
| `deleteProperties.js` → `deleteProperties.ts` | [x] | Complex class with ItemCtx |
| `enabledToEnable.js` → `enabledToEnable.ts` | [x] | |
| `filterConf.js` → `filterConf.ts` | [x] | Configuration filtering |
| `findLocation.js` → `findLocation.ts` | [x] | |
| `formatStr.js` → `formatStr.ts` | [x] | |
| `getBigipVersion.js` → `getBigipVersion.ts` | [x] | |
| `getKey.js` → `getKey.ts` | [x] | |
| `getObjectType.js` → `getObjectType.ts` | [x] | |
| `globalRenameAndSkippedObject.js` → `globalRenameAndSkippedObject.ts` | [x] | Private fields class |
| `handleObjectRef.js` → `handleObjectRef.ts` | [x] | Object reference handling |
| `hyphensToCamel.js` → `hyphensToCamel.ts` | [x] | |
| `ipUtils.js` → `ipUtils.ts` | [x] | IP address utilities with class |
| `isNumber.js` → `isNumber.ts` | [x] | |
| `loadCertsAndKeys.js` → `loadCertsAndKeys.ts` | [x] | Certificate loading |
| `loadDeviceCert.js` → `loadDeviceCert.ts` | [x] | |
| `log.js` → `log.ts` | [x] | Winston logger wrapper |
| `object.js` → `object.ts` | [x] | Object manipulation with lodash |
| `parseNestedString.js` → `parseNestedString.ts` | [x] | |
| `prependObjProps.js` → `prependObjProps.ts` | [x] | |
| `recursiveCamelize.js` → `recursiveCamelize.ts` | [x] | |
| `renameProperties.js` → `renameProperties.ts` | [x] | RenameHistory class |
| `returnEmptyObjIfNone.js` → `returnEmptyObjIfNone.ts` | [x] | |
| `string.js` → `string.ts` | [x] | String utilities |
| `traverseJSON.js` → `traverseJSON.ts` | [x] | JSON traversal algorithm |
| `unquote.js` → `unquote.ts` | [x] | |

---

### I/O (`src/io/`) (2 files)

| File | Status | Notes |
|------|--------|-------|
| `inputReader.js` → `inputReader.ts` | [x] | Various input format handling |
| `ucsReader.js` | [x] | Removed (was duplicate of inputReader) |

---

### AS3 Converter (`src/converters/as3/`) (4 files)

| File | Status | Notes |
|------|--------|-------|
| `index.js` → `index.ts` | [x] | Main AS3 converter entry (uses @ts-nocheck) |
| `cleanup.js` → `cleanup.ts` | [x] | AS3 declaration cleanup |
| `dict.js` → `dict.ts` | [x] | Property dictionaries |
| `properties.js` → `properties.ts` | [x] | Property mappings |

---

### AS3 Engine (`src/converters/as3/engine/`) (4 files)

| File | Status | Notes |
|------|--------|-------|
| `index.js` → `index.ts` | [x] | Engine entry point |
| `converter.js` → `converter.ts` | [x] | Core conversion logic with PropertyContext/ObjectContext classes |
| `defaultActions.js` → `defaultActions.ts` | [x] | Default conversion actions |
| `publicActions.js` → `publicActions.ts` | [x] | Public conversion actions |

---

### AS3 Maps (`src/converters/as3/maps/`) (21 files)

| File | Status | Notes |
|------|--------|-------|
| `certificate.js` → `certificate.ts` | [x] | SSL certificate mappings |
| `cipher.js` → `cipher.ts` | [x] | Cipher configuration |
| `data_group.js` → `data_group.ts` | [x] | Data group mappings |
| `dns.js` → `dns.ts` | [x] | DNS configuration |
| `enforcement.js` → `enforcement.ts` | [x] | PEM enforcement |
| `firewall.js` → `firewall.ts` | [x] | AFM firewall rules |
| `gslb.js` → `gslb.ts` | [x] | Global server load balancing |
| `html_rule.js` → `html_rule.ts` | [x] | HTML profile rules |
| `iapp.js` → `iapp.ts` | [x] | iApp templates |
| `irule.js` → `irule.ts` | [x] | iRule mappings |
| `log_config.js` → `log_config.ts` | [x] | Logging configuration |
| `monitor.js` → `monitor.ts` | [x] | Health monitors |
| `network.js` → `network.ts` | [x] | Network configuration |
| `persist.js` → `persist.ts` | [x] | Persistence profiles |
| `policy.js` → `policy.ts` | [x] | LTM policies |
| `pool.js` → `pool.ts` | [x] | Pool configuration |
| `profile.js` → `profile.ts` | [x] | Various profiles |
| `security.js` → `security.ts` | [x] | Security policies |
| `service.js` → `service.ts` | [x] | Virtual server services |
| `service_address.js` → `service_address.ts` | [x] | Service addresses |
| `snat_pool.js` → `snat_pool.ts` | [x] | SNAT pool configuration |

---

### DO Converter (`src/converters/do/`) (2 files)

| File | Status | Notes |
|------|--------|-------|
| `index.js` → `index.ts` | [x] | Main DO converter entry (uses @ts-nocheck) |
| `maps/doCustomMaps.js` → `doCustomMaps.ts` | [x] | DO-specific mappings |

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
| Validators | 1 | 1 | 100% |
| Parser | 7 | 7 | 100% |
| Utilities | 33 | 33 | 100% |
| I/O | 2 | 2 | 100% |
| AS3 Converter | 4 | 4 | 100% |
| AS3 Engine | 4 | 4 | 100% |
| AS3 Maps | 21 | 21 | 100% |
| DO Converter | 2 | 2 | 100% |
| **Total** | **76** | **76** | **100%** |

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
