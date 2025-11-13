# F5 ACC Refactoring Plan

**Date:** 2025-11-13
**Current Version:** 1.126.0
**Target:** Streamlined TMOS → JSON → AS3/DO conversion engine

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Scope: What to Keep](#scope-what-to-keep)
4. [Scope: What to Remove](#scope-what-to-remove)
5. [Refactoring Phases](#refactoring-phases)
6. [Detailed Removal Plan](#detailed-removal-plan)
7. [Core Engine Isolation](#core-engine-isolation)
8. [Schema Validation Strategy](#schema-validation-strategy)
9. [Testing & Validation](#testing--validation)
10. [Risk Mitigation](#risk-mitigation)
11. [Success Metrics](#success-metrics)

---

## Executive Summary

### Goal
Simplify f5-automation-config-converter by isolating the core conversion engines and removing all AS3 NEXT functionality, reducing complexity and eliminating schema validation issues.

### Primary Objectives
1. **Keep Core Engines:**
   - TMOS config text → Parsed JSON (parser)
   - Parsed JSON → AS3 Classic declarations (AS3 converter)
   - Parsed JSON → DO declarations (DO converter)

2. **Remove NEXT:**
   - All AS3 NEXT conversion logic
   - AS3 NEXT schema validation
   - AS3 NEXT cleanup/post-processing
   - NEXT-specific metadata tracking

3. **Simplify Schema Validation:**
   - Reduce ajv validation complexity
   - Remove AS3 NEXT schema dependency
   - Keep only AS3 Classic and DO schema validation

### Expected Benefits
- **Reduced complexity:** ~30-40% less code
- **Simpler dependencies:** Remove AS3 NEXT schema package
- **Fewer validation issues:** AJV v8 compatibility problems eliminated for NEXT
- **Better maintainability:** Clearer separation of concerns
- **Smaller package size:** Fewer bundled dependencies

---

## Current Architecture Analysis

### Major Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│ • inputReader (preConverter/)                                    │
│   - UCS archive extraction (tar)                                 │
│   - CONF file reading                                            │
│   - Certificate/key file extraction                              │
│   - Multi-file handling                                          │
├─────────────────────────────────────────────────────────────────┤
│                      PRE-CONVERSION                              │
├─────────────────────────────────────────────────────────────────┤
│ • filterConf - Apply allowlists for AS3 properties              │
│ • getCliConfig - Extract CLI configuration (not core)           │
├─────────────────────────────────────────────────────────────────┤
│                      PARSING ENGINE (CORE)                       │
├─────────────────────────────────────────────────────────────────┤
│ • parser.js (engines/)                                           │
│   - TMOS text → JSON object tree                                │
│   - Handles iRules, monitors, nested objects                    │
│   - Edge case handling (brackets, indentation, etc.)            │
│                                                                   │
│ Supporting utilities (util/parse/):                              │
│   - arrToMultilineStr, countIndent, getTitle                    │
│   - objToArr, removeIndent, strToObj                            │
├─────────────────────────────────────────────────────────────────┤
│                    CONVERSION ENGINES (CORE)                     │
├─────────────────────────────────────────────────────────────────┤
│ • as3Converter.js (engines/)                                     │
│   - JSON → AS3 Classic declarations                             │
│   - Object de-duplication                                        │
│   - Reference resolution                                         │
│   - Custom mapping engine (lib/AS3/convertEngine/)              │
│   - AS3 Classic cleanup (as3ClassicCleanUp.js)                  │
│   - AS3 NEXT cleanup (as3NextCleanUp.js) ← REMOVE               │
│                                                                   │
│ • doConverter.js (engines/)                                      │
│   - JSON → DO declarations                                       │
│   - Device configuration handling                                │
│   - Custom DO mappings (lib/DO/doCustomMaps)                    │
│                                                                   │
│ Supporting utilities (util/convert/):                            │
│   - declarationBase, handleObjectRef, ipUtils                   │
│   - renameProperties, cleanupRD, enabledToEnable                │
│   - loadCertsAndKeys, buildProtectedObj                         │
├─────────────────────────────────────────────────────────────────┤
│                    POST-CONVERSION                               │
├─────────────────────────────────────────────────────────────────┤
│ • removeDefaultValuesAS3 - Strip AS3 schema defaults            │
│ • removeDefaultValuesDO - Strip DO schema defaults              │
│ • filterByApplication - Filter by virtual server name           │
├─────────────────────────────────────────────────────────────────┤
│                    VALIDATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│ • lib/validators/as3Classic.js - AS3 Classic schema validation  │
│ • lib/validators/as3Next.js - AS3 NEXT validation ← REMOVE      │
├─────────────────────────────────────────────────────────────────┤
│                    METADATA & LOGGING                            │
├─────────────────────────────────────────────────────────────────┤
│ • analytics.js - Telemetry (F5 TEEM)                            │
│ • declarationStats.js - Count converted objects                 │
│ • logObjects.js - Log conversion results                        │
│ • processingLog/ - Structured logging (for jsonLogs)            │
├─────────────────────────────────────────────────────────────────┤
│                    SUPPORTING UTILITIES                          │
├─────────────────────────────────────────────────────────────────┤
│ • util/countObjects - Count JSON objects                        │
│ • util/getBigipVersion - Extract TMOS version                   │
│ • util/globalRenameAndSkippedObject - Global object tracking    │
│ • util/log - Winston logger wrapper                             │
│ • util/string, util/object, util/traverseJSON                   │
└─────────────────────────────────────────────────────────────────┘
```

### Dependencies Causing Issues

#### Current Bundle Dependencies
```json
"bundleDependencies": [
  "@automation-toolchain/f5-appsvcs-classic-schema",  // AS3 Classic - KEEP
  "@automation-toolchain/f5-appsvcs-schema",          // AS3 NEXT - REMOVE
  "@automation-toolchain/f5-do"                       // DO - KEEP
]
```

#### AJV Version Conflicts
- **Root issue:** AS3 NEXT schema (`@automation-toolchain/f5-appsvcs-schema`) requires ajv@6.x
- **Current state:** Package uses ajv@8.x with compatibility patches
- **NEXT-specific problems:**
  - Unknown keyword `"bigip"` in strict mode
  - Missing `uri` format validator
  - StrictTypes validation failures
  - Union type restrictions

**Resolution:** Remove AS3 NEXT schema entirely → eliminates most ajv compatibility issues

---

## Scope: What to Keep

### Core Conversion Engines

#### 1. **TMOS Parser (KEEP - Critical Core)**
**Files:**
- `src/engines/parser.js` - Main parsing orchestration
- `src/util/parse/` - All parsing utilities
  - `arrToMultilineStr.js`
  - `countIndent.js`
  - `getTitle.js`
  - `objToArr.js`
  - `removeIndent.js`
  - `strToObj.js`

**Purpose:** Converts TMOS configuration text to intermediate JSON representation.

**Why Keep:**
- Foundation for all conversions
- Handles complex TMOS syntax (iRules, nested objects, edge cases)
- No NEXT-specific logic

---

#### 2. **AS3 Classic Converter (KEEP - Core)**
**Files:**
- `src/engines/as3Converter.js` (clean up NEXT references)
- `src/engines/as3ClassicCleanUp.js`
- `src/lib/AS3/convertEngine/` - Conversion engine
- `src/lib/AS3/customMaps/` - Custom type mappings
- `src/lib/AS3/customDict.js` - Supported object dictionary
- `src/lib/AS3/as3Properties.js` - AS3 property definitions
- `src/lib/AS3/as3PropertiesCustom.json`

**Purpose:** Converts parsed JSON to AS3 Classic declarations.

**Changes Needed:**
- Remove `as3NextCleanUp` imports/calls
- Remove NEXT tracking logic (`keyNextNotSupported`, etc.)
- Remove NEXT metadata from return values

---

#### 3. **DO Converter (KEEP - Core)**
**Files:**
- `src/engines/doConverter.js`
- `src/lib/DO/` - All DO custom mappings

**Purpose:** Converts parsed JSON to Declarative Onboarding declarations.

**Why Keep:**
- Core functionality requirement
- No NEXT dependencies
- Clean separation from AS3

---

### Supporting Functionality to Keep

#### 4. **Input Processing (KEEP - Modified)**
**Files:**
- `src/preConverter/inputReader.js` - UCS/CONF file reading
- `src/preConverter/filterConf.js` - Configuration filtering

**Purpose:** Handles archive extraction, file reading, certificate extraction.

**Changes Needed:**
- Keep UCS archive extraction (tar functionality)
- Keep certificate/key extraction
- Keep CONF file reading
- Remove any NEXT-specific filtering logic

**Justification:** Essential for accepting UCS archives and multi-file inputs.

---

#### 5. **Conversion Utilities (KEEP - Core Support)**
**Files:** `src/util/convert/`
- `declarationBase.js` - Base AS3/DO declaration templates
- `handleObjectRef.js` - Resolve object references
- `ipUtils.js` - IP address parsing/validation
- `renameProperties.js` - Property name transformations
- `cleanupRD.js` - Route domain cleanup
- `enabledToEnable.js` - Property normalization
- `loadCertsAndKeys.js` - Certificate handling
- `buildProtectedObj.js` - Secure string handling
- `findLocation.js` - Locate objects in declarations
- `dedupeArray.js` - Array de-duplication
- `convertToNameValueObj.js` - Object structure conversion
- `getObjectType.js` - Type detection
- `recursiveCamelize.js` - Property name transformations
- `deleteProperties.js` - Property removal
- `prependObjProps.js` - Property ordering
- `returnEmptyObjIfNone.js` - Null handling
- `isNumber.js` - Type checking
- `unquote.js` - String cleanup

**Purpose:** Shared utilities for both AS3 and DO conversion.

---

#### 6. **Schema Validation (KEEP - AS3 Classic & DO Only)**
**Files:**
- `src/lib/validators/as3Classic.js` - Keep
- `src/lib/validators/as3Next.js` - **REMOVE**

**Bundle Dependencies:**
- `@automation-toolchain/f5-appsvcs-classic-schema` - **KEEP**
- `@automation-toolchain/f5-appsvcs-schema` - **REMOVE** (AS3 NEXT)
- `@automation-toolchain/f5-do` - **KEEP**

---

#### 7. **Post-Processing (KEEP - Modified)**
**Files:**
- `src/postConverter/removeDefaultValuesAS3.js` - Remove NEXT logic
- `src/postConverter/removeDefaultValuesDO.js` - Keep as-is
- `src/postConverter/filterByApplication.js` - Keep as-is

**Changes:**
- In `removeDefaultValuesAS3.js`: Remove `isNext` parameter handling

---

#### 8. **Logging & Telemetry (KEEP - Modified)**
**Files:**
- `src/util/log.js` - Winston logger wrapper
- `src/processingLog/` - Structured logging
- `src/lib/analytics.js` - F5 TEEM telemetry (remove NEXT metrics)
- `src/lib/declarationStats.js` - Declaration statistics
- `src/lib/logObjects.js` - Result logging (remove NEXT references)

**Changes:** Remove NEXT-specific telemetry and metadata tracking.

---

#### 9. **General Utilities (KEEP)**
**Files:** `src/util/`
- `countObjects.js` - Count objects in JSON
- `getBigipVersion.js` - Extract TMOS version
- `globalRenameAndSkippedObject.js` - Object tracking (clean NEXT refs)
- `object.js` - Object manipulation helpers
- `string.js` - String utilities
- `traverseJSON.js` - JSON traversal (clean NEXT refs)
- `getKey.js` - Extract configuration keys

---

#### 10. **API Layer (KEEP - Modified)**
**Files:**
- `src/main.js` - Main entry point (remove NEXT logic)
- `init.js` - CLI wrapper
- `src/server.js` - Express server (remove NEXT endpoints if any)

**Changes in main.js:**
- Remove `nextFilteredObjects()` function
- Remove `config.next` handling
- Remove `config.nextNotConverted` logic
- Simplify return metadata (remove NEXT fields)

---

## Scope: What to Remove

### Primary Removal Targets

#### 1. **AS3 NEXT Cleanup Module**
**Files to DELETE:**
- `src/engines/as3NextCleanUp.js`

**References to Remove:**
- `src/engines/as3Converter.js` - Remove import and calls

---

#### 2. **AS3 NEXT Validator**
**Files to DELETE:**
- `src/lib/validators/as3Next.js`

---

#### 3. **AS3 NEXT Schema Bundle**
**Package.json Changes:**
```diff
"bundleDependencies": [
  "@automation-toolchain/f5-appsvcs-classic-schema",
- "@automation-toolchain/f5-appsvcs-schema",
  "@automation-toolchain/f5-do"
],
"dependencies": {
  "@automation-toolchain/f5-appsvcs-classic-schema": "1.4.0",
- "@automation-toolchain/f5-appsvcs-schema": "0.52.2",
  "@automation-toolchain/f5-do": "1.43.0",
```

**Update deps/ directory:**
- Keep: `f5-appsvcs-classic-schema-1.4.0.tgz`
- **Remove:** `f5-appsvcs-schema-*.tgz`
- Keep: `f5-declarative-onboarding-*.tgz`

---

#### 4. **NEXT References in Code**

**Search & Remove Pattern:**
```bash
# Files with NEXT references (from grep results):
src/main.d.ts                           # Remove NEXT types
src/constants.js                        # Remove NEXT constants
src/engines/as3Converter.js             # Remove NEXT logic
src/engines/as3NextCleanUp.js           # DELETE FILE
src/engines/parser.js                   # Clean NEXT comments
src/lib/analytics.js                    # Remove NEXT telemetry
src/lib/AS3/convertEngine/converter.js  # Remove NEXT paths
src/lib/AS3/customMaps/data_group.js    # Clean NEXT refs
src/lib/AS3/customMaps/firewall.js      # Clean NEXT refs
src/lib/logObjects.js                   # Remove NEXT logging
src/lib/portDict.json                   # Check for NEXT entries
src/lib/validators/as3Next.js           # DELETE FILE
src/main.js                             # Remove NEXT logic
src/postConverter/removeDefaultValuesAS3.js  # Remove isNext param
src/preConverter/getCliConfig.js        # Clean NEXT refs
src/server.js                           # Remove NEXT endpoints
src/util/convert/declarationBase.js     # Remove NEXT templates
src/util/convert/ipUtils.js             # Clean NEXT refs
src/util/convert/renameProperties.js    # Clean NEXT logic
src/util/globalRenameAndSkippedObject.js # Remove NEXT tracking
src/util/log.js                         # Clean NEXT messages
src/util/traverseJSON.js                # Clean NEXT refs
```

---

#### 5. **Configuration Options to Remove**

**main.js / init.js:**
- Remove `config.next` option
- Remove `config.nextNotConverted` option
- Remove `--next` CLI flag handling

**Return metadata to remove:**
- `as3NextNotConverted`
- `as3NextUndefinedNotConverted`
- `keyNextConverted`
- `keyNextNotSupported`

---

#### 6. **Test Files**

**Pattern:** Find and remove tests for NEXT functionality
```bash
find test/ -name "*next*" -o -name "*Next*"
```

**Clean test expectations:**
- Remove assertions for NEXT fields in metadata
- Remove NEXT-specific test cases
- Update snapshots if using snapshot testing

---

#### 7. **Documentation References**

**Files to Update:**
- `README.md` - Remove NEXT feature descriptions
- `CHANGELOG.md` - Note NEXT removal in new version
- `docs/` - Remove NEXT guides

---

## Refactoring Phases

### Phase 0: Preparation (Risk Mitigation)

**Duration:** 1-2 days

1. **Create feature branch**
   ```bash
   git checkout -b refactor/remove-next-simplify-core
   ```

2. **Backup current state**
   ```bash
   npm pack
   cp f5-automation-config-converter-1.126.0.tgz backups/pre-refactor.tgz
   ```

3. **Document current test coverage**
   ```bash
   npm run coverage
   cp coverage/coverage-summary.json backups/
   ```

4. **Create regression test suite**
   - Collect sample TMOS configs (UCS + CONF)
   - Run current version, save outputs
   - Store in `test/fixtures/regression/`
   - Document expected outputs

5. **Analyze impact**
   ```bash
   # Count NEXT references
   grep -r "next\|Next\|NEXT" src/ --include="*.js" | wc -l

   # List affected files
   grep -rl "next\|Next\|NEXT" src/ --include="*.js" > refactor-files.txt
   ```

---

### Phase 1: Dependency Cleanup

**Duration:** 1 day

#### Step 1.1: Remove AS3 NEXT Schema Dependency

**File:** `package.json`
```diff
"bundleDependencies": [
  "@automation-toolchain/f5-appsvcs-classic-schema",
- "@automation-toolchain/f5-appsvcs-schema",
  "@automation-toolchain/f5-do"
],
"dependencies": {
  "@automation-toolchain/f5-appsvcs-classic-schema": "1.4.0",
- "@automation-toolchain/f5-appsvcs-schema": "0.52.2",
  "@automation-toolchain/f5-do": "1.43.0",
```

#### Step 1.2: Update prepack.sh Script

**File:** `scripts/prepack.sh`

Remove sections that extract and patch `@automation-toolchain/f5-appsvcs-schema`:
- Remove extraction logic for AS3 NEXT schema tarball
- Keep AS3 Classic and DO schema extraction
- Simplify patching logic (fewer packages to patch)

#### Step 1.3: Clean deps/ Directory

```bash
rm deps/f5-appsvcs-schema-*.tgz
```

#### Step 1.4: Clean Install

```bash
rm -rf node_modules package-lock.json
npm install
```

**Verify:** Check that `node_modules/@automation-toolchain/f5-appsvcs-schema` does NOT exist.

---

### Phase 2: Remove NEXT-Specific Files

**Duration:** 1 day

#### Step 2.1: Delete NEXT Cleanup Module

```bash
git rm src/engines/as3NextCleanUp.js
```

#### Step 2.2: Delete NEXT Validator

```bash
git rm src/lib/validators/as3Next.js
```

#### Step 2.3: Delete NEXT Test Files

```bash
# Find and remove NEXT-specific tests
find test/ -iname "*next*" -type f -exec git rm {} \;
```

#### Step 2.4: Update File Structure Documentation

Update any architecture diagrams or file listings in:
- README.md
- PACKAGING.md
- docs/

---

### Phase 3: Code Cleanup - Remove NEXT Logic

**Duration:** 3-5 days

#### Step 3.1: Clean `src/main.js`

**Remove:**
1. `nextFilteredObjects()` function (lines 53-102)
2. `config.next` and `config.nextNotConverted` handling
3. NEXT metadata fields from return objects

**Changes:**
```diff
-const nextFilteredObjects = (obj, filter, renamedDict) => {
-    // ... entire function ...
-};
-
-    // Check if 'next' requested with next-not-converted
-    if (config.nextNotConverted) {
-        config.next = true;
-    }
-
-    // Additional metrics for next
-    const { as3NextNotConverted, as3NextUndefinedNotConverted, keyNextConverted } = nextFilteredObjects(
-        as3Converted,
-        converted.keyNextNotSupported,
-        converted.renamedDict
-    );

     return {
         declaration,
         metadata: {
             as3Converted,
-            as3NextNotConverted,
-            as3NextUndefinedNotConverted,
             as3NotConverted: converted.as3NotConverted,
             as3NotRecognized: converted.as3NotRecognized,
             as3Recognized,
             declarationInfo: declarationStats(declaration),
             jsonCount: countObjects(json),
             jsonLogs,
-            keyNextConverted,
             unsupportedStats: converted.unsupportedStats
         }
     };
```

**Test after each change:**
```bash
npm test
```

---

#### Step 3.2: Clean `src/engines/as3Converter.js`

**Remove:**
1. Import of `as3NextCleanUp`
2. Calls to `as3NextCleanUp()`
3. NEXT tracking in return objects (`keyNextNotSupported`, etc.)
4. NEXT-specific branches in conversion logic

**Search for:**
- `as3NextCleanUp`
- `config.next`
- `isNext`
- `keyNextNotSupported`
- `nextCleanUp`

**Changes:**
```diff
-const as3NextCleanUp = require('./as3NextCleanUp');

 const converted = await as3Converter(json, config);
-if (config.next) {
-    converted.declaration = as3NextCleanUp(converted.declaration);
-}
```

---

#### Step 3.3: Clean `src/postConverter/removeDefaultValuesAS3.js`

**Remove:**
- `isNext` parameter from function signature
- NEXT schema path logic
- AS3 NEXT validator imports

**Search for:**
```javascript
const nextValidator = require('../lib/validators/as3Next');
```

**Changes:**
```diff
-function findSchemaDefault(className, propName, isNext) {
+function findSchemaDefault(className, propName) {
     // Remove isNext branching
-    if (isNext) {
-        // NEXT schema lookup
-    } else {
         // Classic schema lookup
-    }
 }

-module.exports = (declaration, isNext) => {
+module.exports = (declaration) => {
```

Update call sites in `src/main.js`:
```diff
-declaration = removeDefaultValuesAS3(declaration, config.next);
+declaration = removeDefaultValuesAS3(declaration);
```

---

#### Step 3.4: Clean `src/lib/logObjects.js`

**Remove:**
- Logging for `as3NextNotConverted`
- Logging for `as3NextUndefinedNotConverted`
- Logging for `keyNextConverted`

**Search for:** Lines that reference NEXT metadata fields.

---

#### Step 3.5: Clean `src/lib/analytics.js`

**Remove:**
- NEXT-specific telemetry tracking
- NEXT conversion statistics

**Search for:** `next` in analytics payload construction.

---

#### Step 3.6: Clean `src/constants.js`

**Remove:**
- NEXT-related constants
- AS3 NEXT schema version constants

**Search for:** `NEXT`, `next`, `appsvcs-schema`

---

#### Step 3.7: Clean Utility Files

**Files to clean:**
- `src/util/globalRenameAndSkippedObject.js`
- `src/util/traverseJSON.js`
- `src/util/convert/declarationBase.js` (remove NEXT declaration templates)
- `src/util/convert/renameProperties.js`
- `src/util/convert/ipUtils.js`

**Action:** Remove NEXT-specific branches, comments, and logic.

---

#### Step 3.8: Clean Type Definitions

**File:** `src/main.d.ts`

Remove NEXT-related types:
```diff
 export interface ConversionResult {
     declaration: object;
     metadata: {
         as3Converted: object;
-        as3NextNotConverted: object;
-        as3NextUndefinedNotConverted: string[];
         as3NotConverted: object;
         as3NotRecognized: object;
         as3Recognized: object;
         declarationInfo: object;
         jsonCount: object;
         jsonLogs: any[];
-        keyNextConverted: string[];
         unsupportedStats: object;
         logs: any[];
     };
 }

 export interface Config {
-    next?: boolean;
-    nextNotConverted?: boolean;
     declarativeOnboarding?: boolean;
     // ... other options ...
 }
```

---

#### Step 3.9: Update CLI (init.js)

**File:** `init.js`

Remove `--next` flag handling:
```diff
 program
     .option('--conf <file>', 'path to local configuration file')
     .option('--ucs <file>', 'path to local UCS file')
-    .option('--next', 'generate AS3 NEXT declaration')
-    .option('--next-not-converted', 'show objects not converted for AS3 NEXT')
```

---

#### Step 3.10: Update Server Endpoints

**File:** `src/server.js`

Remove NEXT-specific API endpoints or request handling:
- Check for `/next` routes
- Check for `next` query parameters
- Remove NEXT validation in request handlers

---

### Phase 4: Schema Validation Simplification

**Duration:** 2-3 days

#### Step 4.1: Verify AS3 Classic Validator

**File:** `src/lib/validators/as3Classic.js`

Ensure it ONLY references:
- `@automation-toolchain/f5-appsvcs-classic-schema`
- No NEXT schema imports

**Test:**
```javascript
const validator = require('./src/lib/validators/as3Classic');
const testDecl = { /* AS3 Classic declaration */ };
validator.validate(testDecl).then(result => {
    console.log(result.isValid ? 'PASS' : 'FAIL');
});
```

---

#### Step 4.2: Update prepack.sh Patching Logic

**File:** `scripts/prepack.sh`

**Current state:** Patches both AS3 Classic and AS3 NEXT schemas for ajv@8 compatibility.

**New state:** Only patch AS3 Classic and DO schemas.

**Changes:**
1. Remove extraction of `f5-appsvcs-schema` tarball
2. Remove patching logic for AS3 NEXT schema validators
3. Keep patching for:
   - `@automation-toolchain/f5-appsvcs-classic-schema`
   - `@automation-toolchain/f5-do`

**Verify patching still works:**
```bash
npm run prepack
tar -tzf f5-automation-config-converter-*.tgz | grep "@automation-toolchain"
# Should see ONLY f5-appsvcs-classic-schema and f5-do
```

---

#### Step 4.3: Update AJV Compatibility Documentation

**Files:**
- `AJV_V8_COMPATIBILITY.md`
- `VSCE_PACKAGING_ISSUE.md`

**Changes:**
- Note that AS3 NEXT has been removed
- Update fix instructions to only cover AS3 Classic schema
- Simplify compatibility matrix

---

### Phase 5: Testing & Validation

**Duration:** 3-5 days

#### Step 5.1: Unit Tests

**Run existing unit tests:**
```bash
npm test
```

**Expected failures:**
- Tests for NEXT functionality (already removed)
- Tests expecting NEXT metadata fields

**Action:**
- Remove or update tests expecting NEXT fields
- Ensure AS3 Classic and DO conversion tests pass

---

#### Step 5.2: Integration Tests

**Test end-to-end conversion:**

```javascript
// test/integration/as3-classic-conversion.test.js
const accc = require('../../src/main');

describe('AS3 Classic Conversion', () => {
    it('should convert TMOS config to AS3 Classic', async () => {
        const tmosConfig = `
ltm pool /Common/test_pool {
    members {
        /Common/192.168.1.10:80 { }
    }
}
ltm virtual /Common/test_vs {
    destination /Common/192.168.1.100:443
    pool /Common/test_pool
}
        `;

        const result = await accc.mainAPI(tmosConfig, {});

        expect(result.declaration).to.exist;
        expect(result.declaration.class).to.equal('ADC');
        expect(result.metadata).to.not.have.property('as3NextNotConverted');
        expect(result.metadata.as3Converted).to.exist;
    });
});
```

---

#### Step 5.3: Regression Testing

**Use fixtures from Phase 0:**
```bash
# Run against pre-refactor outputs
node test/regression/compare-outputs.js
```

**Verify:**
1. AS3 Classic declarations match previous version (minus NEXT metadata)
2. DO declarations unchanged
3. No new errors introduced

---

#### Step 5.4: UCS Archive Testing

**Test UCS extraction still works:**
```javascript
const inputReader = require('./src/preConverter/inputReader');

const data = await inputReader.read(['path/to/test.ucs']);
expect(Object.keys(data).length).to.be.greaterThan(0);
```

---

#### Step 5.5: Schema Validation Testing

**Test AS3 Classic validation:**
```javascript
const validator = require('./src/lib/validators/as3Classic');

const validDecl = {
    class: 'ADC',
    schemaVersion: '3.0.0',
    // ... valid AS3 Classic declaration
};

const result = await validator.validate(validDecl);
expect(result.isValid).to.be.true;
```

**Test DO validation:**
```javascript
// Similar test for DO declarations
```

---

#### Step 5.6: Package Build Testing

**Test packaging:**
```bash
npm pack

# Extract and verify
tar -tzf f5-automation-config-converter-*.tgz | grep "@automation-toolchain"

# Should see:
# node_modules/@automation-toolchain/f5-appsvcs-classic-schema
# node_modules/@automation-toolchain/f5-do
# Should NOT see:
# node_modules/@automation-toolchain/f5-appsvcs-schema
```

---

#### Step 5.7: VSCode Extension Integration Testing

**Test in vscode-f5-chariot:**
```bash
cd ../vscode-f5-chariot
npm install ../accc/f5-automation-config-converter-*.tgz
vsce package  # Should succeed without --no-dependencies
```

**Runtime test:** Load extension, convert TMOS config, verify no errors.

---

### Phase 6: Documentation & Cleanup

**Duration:** 2-3 days

#### Step 6.1: Update README.md

**Remove:**
- AS3 NEXT feature descriptions
- `--next` flag documentation
- NEXT conversion examples

**Add:**
- Note about NEXT removal
- Simplified feature list
- Updated architecture diagram

---

#### Step 6.2: Update CHANGELOG.md

**Add new version entry:**
```markdown
## [2.0.0] - 2025-XX-XX

### BREAKING CHANGES
- Removed AS3 NEXT conversion functionality
- Removed `--next` and `--next-not-converted` CLI flags
- Removed `config.next` API option
- Removed AS3 NEXT metadata fields from conversion results
- Removed `@automation-toolchain/f5-appsvcs-schema` dependency

### Changed
- Simplified schema validation (AS3 Classic and DO only)
- Reduced package size by ~30%
- Improved AJV v8 compatibility

### Fixed
- Eliminated AJV strict mode issues with NEXT schemas
```

---

#### Step 6.3: Update Technical Documentation

**Files:**
- `PACKAGING.md` - Update bundled dependencies list
- `AJV_V8_COMPATIBILITY.md` - Simplify (fewer schemas to patch)
- `VSCE_PACKAGING_ISSUE.md` - Note resolution
- Create new: `REFACTORING_CHANGELOG.md` - Document what was removed and why

---

#### Step 6.4: Update API Documentation

**File:** `docs/API.md` (or similar)

Remove NEXT-related:
- Configuration options
- Return metadata fields
- Examples

---

#### Step 6.5: Create Migration Guide

**File:** `MIGRATION_V2.md`

```markdown
# Migration Guide: v1.x → v2.x

## Breaking Changes

### Removed Features
- AS3 NEXT conversion has been removed
- Use AS3 Classic conversion instead

### Removed Configuration Options
- `config.next` - No longer supported
- `config.nextNotConverted` - No longer supported
- CLI flags `--next` and `--next-not-converted` removed

### Removed Metadata Fields
Conversion results no longer include:
- `metadata.as3NextNotConverted`
- `metadata.as3NextUndefinedNotConverted`
- `metadata.keyNextConverted`

### Migration Steps
1. Remove `--next` flag from CLI commands
2. Remove `config.next` from API calls
3. Update code expecting NEXT metadata fields
4. Use AS3 Classic declarations for all conversions

## Benefits
- Simpler schema validation
- Smaller package size
- Better maintainability
- Fewer dependency conflicts
```

---

#### Step 6.6: Update Package Metadata

**File:** `package.json`

```diff
{
  "name": "f5-automation-config-converter",
- "version": "1.126.0",
+ "version": "2.0.0",
  "description": "Convert F5 TMOS configuration to AS3 Classic and Declarative Onboarding declarations",
```

Consider adding:
```json
{
  "keywords": [
    "f5",
    "bigip",
    "tmos",
    "as3",
    "as3-classic",
    "declarative-onboarding",
    "config-converter"
  ]
}
```

---

### Phase 7: Final Validation & Release

**Duration:** 2-3 days

#### Step 7.1: Full Test Suite

```bash
npm run lint
npm run type-check
npm test
npm run coverage
```

**Verify:**
- All tests pass
- Coverage maintained (≥95% per nyc config)
- No lint errors
- Type checking passes

---

#### Step 7.2: Manual Testing Checklist

- [ ] Convert simple TMOS config (pool + virtual server)
- [ ] Convert complex TMOS config (profiles, monitors, policies, iRules)
- [ ] Convert DO-specific config (device settings, VLANs, routes)
- [ ] Extract and convert UCS archive
- [ ] Validate AS3 Classic output with schema
- [ ] Validate DO output with schema
- [ ] Test filterByApplication (--vs-name)
- [ ] Test safe mode (--safe-mode)
- [ ] Test show extended (--show-extended)
- [ ] Test analytics/telemetry (if applicable)

---

#### Step 7.3: Performance Testing

**Compare package sizes:**
```bash
# Before (v1.126.0)
ls -lh f5-automation-config-converter-1.126.0.tgz
# Expected: ~2.6 MB

# After (v2.0.0)
npm pack
ls -lh f5-automation-config-converter-2.0.0.tgz
# Expected: ~1.8-2.0 MB (30% reduction)
```

**Measure conversion time:**
```javascript
console.time('conversion');
await accc.mainAPI(largeConfig, {});
console.timeEnd('conversion');
```

Compare before/after for performance regression.

---

#### Step 7.4: Dependency Audit

```bash
npm audit
npm ls --all
```

**Verify:**
- No critical vulnerabilities
- No unexpected dependencies
- Correct versions of AS3 Classic and DO schemas

---

#### Step 7.5: Create Release Branch

```bash
git checkout -b release/v2.0.0
git merge refactor/remove-next-simplify-core
```

**Tag release:**
```bash
git tag -a v2.0.0 -m "Release v2.0.0 - Remove AS3 NEXT, simplify core engines"
git push origin v2.0.0
```

---

#### Step 7.6: Build Distribution Package

```bash
npm pack
```

**Distribute:**
- Copy to vscode-f5-chariot project
- Upload to internal registry (if applicable)
- Create GitHub release with changelog

---

## Detailed Removal Plan

### Files to DELETE Completely

```
src/engines/as3NextCleanUp.js
src/lib/validators/as3Next.js
deps/f5-appsvcs-schema-0.52.2.tgz (or similar)
test/**/*next*.js (NEXT-specific test files)
```

---

### Files to MODIFY (Remove NEXT Logic)

#### High Priority (Core Conversion)

| File | Lines to Change | Changes |
|------|----------------|---------|
| `src/main.js` | 50-102, 133-135, 215-219, 248-249, 256 | Remove `nextFilteredObjects()`, NEXT config handling, NEXT metadata |
| `src/engines/as3Converter.js` | Imports, cleanup calls | Remove `as3NextCleanUp` import/calls |
| `src/postConverter/removeDefaultValuesAS3.js` | Function signatures, schema paths | Remove `isNext` parameter |
| `init.js` | CLI option definitions | Remove `--next` flags |

---

#### Medium Priority (Support Functions)

| File | Changes |
|------|---------|
| `src/lib/analytics.js` | Remove NEXT telemetry fields |
| `src/lib/logObjects.js` | Remove NEXT logging |
| `src/lib/declarationStats.js` | Remove NEXT stat tracking |
| `src/util/globalRenameAndSkippedObject.js` | Remove NEXT comments/logic |
| `src/util/traverseJSON.js` | Remove NEXT branches |
| `src/util/convert/declarationBase.js` | Remove NEXT declaration templates |

---

#### Low Priority (Cleanup)

| File | Changes |
|------|---------|
| `src/constants.js` | Remove NEXT constants |
| `src/main.d.ts` | Remove NEXT types |
| `src/lib/AS3/customMaps/*.js` | Clean NEXT comments |
| Various utility files | Remove stray NEXT comments |

---

### Files to UPDATE (Documentation)

```
README.md - Remove NEXT features
CHANGELOG.md - Add v2.0.0 breaking changes
PACKAGING.md - Update bundled deps list
AJV_V8_COMPATIBILITY.md - Simplify (only Classic schema)
VSCE_PACKAGING_ISSUE.md - Note resolution
Create: MIGRATION_V2.md
Create: REFACTORING_CHANGELOG.md
```

---

### package.json Changes

```diff
{
- "version": "1.126.0",
+ "version": "2.0.0",

  "bundleDependencies": [
    "@automation-toolchain/f5-appsvcs-classic-schema",
-   "@automation-toolchain/f5-appsvcs-schema",
    "@automation-toolchain/f5-do"
  ],

  "dependencies": {
    "@automation-toolchain/f5-appsvcs-classic-schema": "1.4.0",
-   "@automation-toolchain/f5-appsvcs-schema": "0.52.2",
    "@automation-toolchain/f5-do": "1.43.0",
    ...
  }
}
```

---

## Core Engine Isolation

### Goal
Make the three core engines (parser, AS3 Classic converter, DO converter) independently testable and reusable.

### Recommended Structure (Post-Refactor)

```
src/
├── engines/                      # Core conversion engines
│   ├── parser.js                 # TMOS → JSON parser (standalone)
│   ├── as3Converter.js           # JSON → AS3 Classic (uses lib/AS3)
│   ├── as3ClassicCleanUp.js      # AS3 Classic post-processing
│   └── doConverter.js            # JSON → DO (uses lib/DO)
│
├── lib/                          # Engine-specific libraries
│   ├── AS3/                      # AS3 conversion support
│   │   ├── convertEngine/        # Conversion logic
│   │   ├── customMaps/           # Type mappings
│   │   ├── customDict.js         # Supported objects
│   │   └── as3Properties.js      # Property definitions
│   │
│   ├── DO/                       # DO conversion support
│   │   └── doCustomMaps.js       # DO-specific mappings
│   │
│   └── validators/               # Schema validation
│       └── as3Classic.js         # AS3 Classic validator only
│
├── util/                         # Shared utilities
│   ├── parse/                    # Parsing utilities (for parser engine)
│   └── convert/                  # Conversion utilities (for converters)
│
├── preConverter/                 # Input processing
│   ├── inputReader.js            # UCS/CONF reading
│   └── filterConf.js             # Configuration filtering
│
├── postConverter/                # Output processing
│   ├── removeDefaultValuesAS3.js # AS3 default stripping
│   ├── removeDefaultValuesDO.js  # DO default stripping
│   └── filterByApplication.js    # VS name filtering
│
├── main.js                       # Orchestration layer
└── server.js                     # HTTP API (optional)
```

---

### Isolation Principles

#### 1. Parser Engine Independence

**Current:** Parser is already fairly isolated.

**Goal:** Make it completely standalone.

**Changes:**
- Ensure parser only depends on `util/parse/` utilities
- No AS3/DO-specific logic in parser
- Output pure JSON representation of TMOS config
- Document JSON schema output format

**Test in isolation:**
```javascript
const parser = require('./engines/parser');

const tmosConfig = { 'config.conf': `ltm pool /Common/test { }` };
const json = parser(tmosConfig);

// json should be pure JSON, no AS3/DO concepts
expect(json).to.deep.equal({
    'ltm pool /Common/test': {}
});
```

---

#### 2. AS3 Converter Independence

**Current:** AS3 converter has some tight coupling to `main.js`.

**Goal:** Self-contained conversion engine.

**Interface:**
```javascript
/**
 * Convert parsed TMOS JSON to AS3 Classic declaration
 *
 * @param {Object} json - Parsed TMOS configuration (from parser)
 * @param {Object} config - Conversion options
 * @returns {Promise<Object>} AS3 declaration + metadata
 */
async function as3Converter(json, config) {
    return {
        declaration: { /* AS3 Classic declaration */ },
        as3NotConverted: { /* unsupported objects */ },
        as3NotRecognized: { /* unrecognized objects */ },
        renamedDict: { /* renamed objects */ },
        unsupportedStats: { /* conversion statistics */ }
    };
}
```

**Dependencies:**
- `lib/AS3/` - AS3-specific libraries
- `util/convert/` - Conversion utilities
- NO direct dependency on `main.js` or server logic

**Test in isolation:**
```javascript
const as3Converter = require('./engines/as3Converter');

const json = {
    'ltm pool /Common/test_pool': { members: { '192.168.1.10:80': {} } }
};

const result = await as3Converter(json, {});
expect(result.declaration.Common.test_pool.class).to.equal('Pool');
```

---

#### 3. DO Converter Independence

**Current:** DO converter is already fairly independent.

**Goal:** Maintain independence, document interface.

**Interface:**
```javascript
/**
 * Convert parsed TMOS JSON to DO declaration
 *
 * @param {Object} json - Parsed TMOS configuration (from parser)
 * @param {Object} config - Conversion options
 * @returns {Object} DO declaration
 */
function doConverter(json, config) {
    return { /* DO declaration */ };
}
```

---

### Orchestration Layer (main.js)

**Purpose:** Wire together engines, handle I/O, apply pre/post processing.

**Responsibilities:**
1. Input reading (via `inputReader`)
2. Call parser
3. Route to AS3 or DO converter
4. Apply post-processors
5. Add metadata
6. Return results

**NOT responsible for:** Core conversion logic (delegated to engines).

---

## Schema Validation Strategy

### Current Problem

**AS3 NEXT schema causes most AJV v8 issues:**
- Unknown `bigip` keyword
- Missing `uri` format
- Strict type requirements
- Union type restrictions

**Resolution:** Remove AS3 NEXT schema → eliminates 80% of validation problems.

---

### Post-Refactor Schema Strategy

#### Keep Only Two Schemas

1. **AS3 Classic Schema** (`@automation-toolchain/f5-appsvcs-classic-schema`)
   - Already patched for ajv@8 via prepack.sh
   - Validates AS3 Classic declarations
   - Stable, minimal issues

2. **DO Schema** (`@automation-toolchain/f5-do`)
   - Already patched for ajv@8 via prepack.sh
   - Validates DO declarations
   - Stable, minimal issues

---

#### Simplified prepack.sh Patching

**Before:** Patch 3 schemas (Classic, NEXT, DO)
**After:** Patch 2 schemas (Classic, DO)

**Patches to keep:**
- Add `strict: false` to ajv constructors
- Update package.json deps to use ajv@^8.17.1
- Add missing format validators (if needed)

**Patches to remove:**
- AS3 NEXT schema extraction
- AS3 NEXT validator patching

---

#### Validation Flow

```
Input Declaration
    ↓
Detect Type (AS3 or DO)
    ↓
    ├─→ AS3 Classic? → Use as3Classic.js validator
    │                   → Schema: f5-appsvcs-classic-schema
    │                   → Return isValid + errors
    │
    └─→ DO? → Use DO built-in validation
              → Schema: f5-do
              → Return isValid + errors
```

**No NEXT validation path** - simplified!

---

#### Remove Optional Validation

**Consider:** If schema validation is still causing issues, make it optional.

```javascript
// In main.js
if (config.validate !== false) {
    const validationResult = await validator.validate(declaration);
    if (!validationResult.isValid) {
        log.warn('Declaration validation failed', validationResult.errors);
    }
}
```

**Benefits:**
- Users can skip validation if schemas are problematic
- Conversion still works even if validation fails
- Reduces dependency on complex schema packages

---

#### Future: Consider Lighter Validation

**Option:** Replace full AJV schema validation with lightweight custom validation.

**Pros:**
- No AJV dependency issues
- Faster validation
- Simpler maintenance

**Cons:**
- Won't catch all schema violations
- More work to implement

**Decision:** Defer to future version if AJV issues persist.

---

## Testing & Validation

### Test Coverage Goals

**Maintain current coverage:**
- Statements: ≥95%
- Branches: ≥85%
- Functions: ≥95%
- Lines: ≥95%

**After removing NEXT:**
- Remove NEXT-specific tests
- Add tests for simplified logic
- Ensure AS3 Classic and DO paths still covered

---

### Test Categories

#### 1. Unit Tests

**Parser tests:**
```javascript
describe('Parser Engine', () => {
    it('should parse ltm pool', () => {
        const input = 'ltm pool /Common/test { members { 192.168.1.10:80 { } } }';
        const result = parser({ 'config.conf': input });
        expect(result).to.have.property('ltm pool /Common/test');
    });

    it('should handle iRules', () => { /* ... */ });
    it('should handle nested objects', () => { /* ... */ });
    it('should handle edge cases', () => { /* ... */ });
});
```

**AS3 converter tests:**
```javascript
describe('AS3 Converter Engine', () => {
    it('should convert pool to AS3 Pool class', () => { /* ... */ });
    it('should convert virtual server', () => { /* ... */ });
    it('should handle object references', () => { /* ... */ });
    it('should dedupe object names', () => { /* ... */ });
});
```

**DO converter tests:**
```javascript
describe('DO Converter Engine', () => {
    it('should convert device config', () => { /* ... */ });
    it('should convert VLANs', () => { /* ... */ });
    it('should convert routes', () => { /* ... */ });
});
```

---

#### 2. Integration Tests

**End-to-end AS3 conversion:**
```javascript
describe('E2E AS3 Conversion', () => {
    it('should convert full TMOS config to AS3', async () => {
        const tmosConfig = fs.readFileSync('fixtures/full-config.conf', 'utf8');
        const result = await accc.mainAPI(tmosConfig, {});

        expect(result.declaration.class).to.equal('ADC');
        expect(result.metadata.as3Converted).to.exist;
        expect(result.metadata).to.not.have.property('as3NextNotConverted');
    });
});
```

**UCS extraction + conversion:**
```javascript
it('should extract and convert UCS archive', async () => {
    const result = await accc.main(null, { ucs: 'fixtures/test.ucs' });
    expect(result.declaration).to.exist;
});
```

---

#### 3. Regression Tests

**Compare outputs before/after refactor:**
```javascript
const expectedOutput = require('./fixtures/expected-output-v1.json');

it('should produce same output as v1 (minus NEXT fields)', async () => {
    const result = await accc.mainAPI(tmosConfig, {});

    // Remove NEXT fields from v1 expected output
    delete expectedOutput.metadata.as3NextNotConverted;
    delete expectedOutput.metadata.keyNextConverted;

    expect(result).to.deep.equal(expectedOutput);
});
```

---

#### 4. Schema Validation Tests

```javascript
describe('Schema Validation', () => {
    it('should validate AS3 Classic declaration', async () => {
        const validator = require('./lib/validators/as3Classic');
        const decl = { /* valid AS3 Classic */ };

        const result = await validator.validate(decl);
        expect(result.isValid).to.be.true;
    });

    it('should reject invalid AS3 Classic declaration', async () => {
        const validator = require('./lib/validators/as3Classic');
        const decl = { /* invalid */ };

        const result = await validator.validate(decl);
        expect(result.isValid).to.be.false;
        expect(result.errors).to.exist;
    });
});
```

---

#### 5. Package Build Tests

```javascript
describe('Package Build', () => {
    it('should not include AS3 NEXT schema', () => {
        const tarball = execSync('npm pack').toString().trim();
        const contents = execSync(`tar -tzf ${tarball}`).toString();

        expect(contents).to.not.include('f5-appsvcs-schema');
        expect(contents).to.include('f5-appsvcs-classic-schema');
        expect(contents).to.include('f5-do');
    });
});
```

---

## Risk Mitigation

### Risk 1: Breaking Existing Integrations

**Risk Level:** HIGH

**Impact:** Downstream projects (vscode-f5-chariot) may break if expecting NEXT fields.

**Mitigation:**
1. **Version bump to 2.0.0** - Signals breaking changes
2. **Create migration guide** - Document all breaking changes
3. **Test in vscode-f5-chariot** before release
4. **Maintain v1.x branch** for critical fixes if needed

**Rollback Plan:** Keep v1.126.0 tarball, revert package.json version.

---

### Risk 2: Test Coverage Reduction

**Risk Level:** MEDIUM

**Impact:** Removing NEXT tests may reduce overall coverage.

**Mitigation:**
1. **Document baseline coverage** before refactoring
2. **Add tests for simplified logic**
3. **Run coverage reports** after each phase
4. **Ensure ≥95% coverage** maintained

**Action:** If coverage drops, add tests to uncovered branches.

---

### Risk 3: Unintended Logic Removal

**Risk Level:** MEDIUM

**Impact:** Accidentally removing shared logic referenced by NEXT paths.

**Mitigation:**
1. **Use grep/IDE refactoring tools** carefully
2. **Review each change** in pull request
3. **Run full test suite** after each modification
4. **Manual testing checklist**

**Action:** If tests fail unexpectedly, revert and investigate.

---

### Risk 4: Schema Validation Still Broken

**Risk Level:** LOW (after NEXT removal)

**Impact:** AS3 Classic or DO validation fails with ajv@8.

**Mitigation:**
1. **Test schema validation** extensively in Phase 4
2. **Keep prepack.sh patching** for Classic and DO schemas
3. **Make validation optional** if issues persist
4. **Document workarounds** in AJV_V8_COMPATIBILITY.md

**Action:** If validation fails, add additional patches to prepack.sh or make validation skippable.

---

### Risk 5: Package Size Not Reduced

**Risk Level:** LOW

**Impact:** Package size doesn't decrease as expected.

**Mitigation:**
1. **Verify AS3 NEXT schema removed** from bundle
2. **Check for unused dependencies** with `npm ls --all`
3. **Remove dead code** (unused imports, functions)

**Action:** Run `npm prune` and audit package contents.

---

### Risk 6: Performance Regression

**Risk Level:** LOW

**Impact:** Conversion slower after refactoring.

**Mitigation:**
1. **Benchmark before refactoring**
2. **Re-benchmark after each phase**
3. **Profile if performance degrades**

**Action:** If slower, investigate with Node.js profiler.

---

## Success Metrics

### Quantitative Metrics

| Metric | Current (v1.126.0) | Target (v2.0.0) | Status |
|--------|-------------------|-----------------|--------|
| Package size | ~2.6 MB | ≤2.0 MB (~30% reduction) | TBD |
| Bundled dependencies | 3 | 2 | TBD |
| Lines of code (src/) | TBD | -20% to -30% | TBD |
| Test coverage | 95%+ | ≥95% | TBD |
| Build time | TBD | ≤Current | TBD |
| Conversion time (large config) | TBD | ≤Current | TBD |

---

### Qualitative Metrics

- [ ] **Code clarity improved** - Fewer branches, simpler logic
- [ ] **Easier to test** - Core engines isolated
- [ ] **Fewer ajv issues** - AS3 NEXT schema removed
- [ ] **Better maintainability** - Single conversion path (AS3 Classic only)
- [ ] **Documentation complete** - README, CHANGELOG, migration guide updated
- [ ] **Integration tests pass** - vscode-f5-chariot works with v2.0.0

---

### Acceptance Criteria

**Before release, all must be TRUE:**

1. ✅ All AS3 NEXT code removed (verified by grep)
2. ✅ AS3 NEXT schema removed from bundle (verified by tar listing)
3. ✅ All unit tests pass
4. ✅ All integration tests pass
5. ✅ Regression tests pass (output matches v1.x for AS3 Classic)
6. ✅ Test coverage ≥95%
7. ✅ Package builds successfully
8. ✅ vscode-f5-chariot extension works with new package
9. ✅ Documentation updated (README, CHANGELOG, migration guide)
10. ✅ No lint errors
11. ✅ Type checking passes
12. ✅ No critical npm audit vulnerabilities

---

## Additional Components to Consider

Beyond the core engines (parser, AS3 converter, DO converter), these components should be evaluated:

### 1. Certificate & Key Handling (KEEP)

**Files:**
- `src/util/convert/loadCertsAndKeys.js`
- `src/util/convert/loadDeviceCert.js`
- `src/util/convert/buildProtectedObj.js`

**Purpose:** Extract certificates/keys from UCS, convert to AS3/DO format.

**Decision:** **KEEP** - Essential for secure configuration conversion.

---

### 2. Object Reference Resolution (KEEP)

**Files:**
- `src/util/convert/handleObjectRef.js`
- `src/util/convert/findLocation.js`

**Purpose:** Resolve TMOS object references (e.g., pool members referencing nodes).

**Decision:** **KEEP** - Critical for correct AS3 declarations.

---

### 3. IP Address Utilities (KEEP)

**File:** `src/util/convert/ipUtils.js`

**Purpose:** Parse, validate, and manipulate IP addresses (IPv4, IPv6, route domains).

**Decision:** **KEEP** - Essential for network configuration.

---

### 4. Object De-duplication (KEEP)

**Function:** `deDupeObjectNames()` in `as3Converter.js`

**Purpose:** Rename objects with duplicate names to avoid conflicts.

**Decision:** **KEEP** - Required for valid AS3 declarations.

---

### 5. Global Object Tracking (KEEP - Clean NEXT refs)

**File:** `src/util/globalRenameAndSkippedObject.js`

**Purpose:** Track renamed and skipped objects across conversion process.

**Decision:** **KEEP** - Used by both AS3 and DO converters.

**Action:** Remove NEXT-specific tracking logic.

---

### 6. Analytics/Telemetry (KEEP - Modified)

**File:** `src/lib/analytics.js`

**Purpose:** Send anonymous telemetry to F5 TEEM.

**Decision:** **KEEP** - Product requirement.

**Action:** Remove NEXT-specific metrics.

---

### 7. Processing Logs (KEEP - Optional)

**Directory:** `src/processingLog/`

**Purpose:** Structured logging for debugging (enabled via `config.jsonLogs`).

**Decision:** **KEEP** - Useful for troubleshooting.

**Action:** Remove NEXT-related log entries.

---

### 8. HTTP Server (EVALUATE)

**File:** `src/server.js`

**Purpose:** Express server for HTTP API.

**Decision:** **KEEP (probably)** - May be used by downstream projects.

**Action:**
- Remove NEXT-specific endpoints (if any)
- Keep AS3 Classic and DO endpoints
- Consider deprecation notice if unused

---

### 9. CLI Wrapper (KEEP)

**File:** `init.js`

**Purpose:** Commander.js CLI for command-line usage.

**Decision:** **KEEP** - Primary interface for many users.

**Action:** Remove `--next` flags.

---

### 10. Default Values Removal (KEEP)

**Files:**
- `src/postConverter/removeDefaultValuesAS3.js`
- `src/postConverter/removeDefaultValuesDO.js`

**Purpose:** Strip properties with default values to simplify declarations.

**Decision:** **KEEP** - Improves declaration readability.

**Action:** Remove `isNext` parameter from AS3 version.

---

### 11. Application Filtering (KEEP)

**File:** `src/postConverter/filterByApplication.js`

**Purpose:** Extract single application (virtual server) from declaration.

**Decision:** **KEEP** - Useful feature for large configs.

---

### 12. Statistics & Logging (KEEP - Modified)

**Files:**
- `src/lib/declarationStats.js`
- `src/lib/logObjects.js`

**Purpose:** Count converted objects, log results.

**Decision:** **KEEP** - Useful for users.

**Action:** Remove NEXT-specific logging.

---

## Summary: What's Included in Core

### Absolute Core (Cannot Remove)
1. **Parser** - TMOS → JSON
2. **AS3 Converter** - JSON → AS3 Classic
3. **DO Converter** - JSON → DO

### Essential Support (Keep)
4. **Input Reader** - UCS/CONF extraction
5. **Conversion Utilities** - IP, references, certificates
6. **Schema Validators** - AS3 Classic, DO (not NEXT)
7. **Post-processors** - Default removal, filtering

### Optional Support (Keep for UX)
8. **CLI** - Command-line interface
9. **Server** - HTTP API
10. **Analytics** - Telemetry
11. **Logging** - Processing logs, statistics

### Remove Entirely
- AS3 NEXT conversion
- AS3 NEXT validation
- AS3 NEXT schema
- NEXT metadata tracking

---

## Conclusion

This refactoring will:
- **Simplify** the codebase by removing 20-30% of AS3 NEXT-related code
- **Improve** maintainability by isolating core engines
- **Resolve** most AJV v8 compatibility issues
- **Reduce** package size by ~30%
- **Focus** on stable AS3 Classic and DO conversion

The refactor is large but low-risk if done in phases with thorough testing at each step.

**Estimated total time:** 12-20 days (2-4 weeks)

**Recommended approach:** Follow phases sequentially, test after each phase, create checkpoints for rollback.

---

*Document created: 2025-11-13*
*Version: 1.0*
