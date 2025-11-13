# TMOS Converter - Extraction Plan

**Date:** 2025-11-13
**Source:** f5-automation-config-converter v1.126.0
**Goal:** Extract core conversion engines into standalone library

---

## Overview

Extract three core engines from f5-acc:
1. **TMOS Parser** - Configuration text → JSON
2. **AS3 Classic Converter** - JSON → AS3 declarations
3. **DO Converter** - JSON → DO declarations

**Key Decision:** Skip all AS3 NEXT functionality (never copy it)

---

## Source Attribution

- **Original:** https://github.com/f5devcentral/f5-automation-config-converter
- **Version:** 1.126.0 (commit: 05b0737713ef54caaf20da09524d10fa8a4ee86d)
- **License:** Apache-2.0
- **Extraction Date:** 2025-11-13

---

## Extraction Map

### Core Engines (Copy & Clean)

| Source | Destination | Action |
|--------|-------------|--------|
| `src/engines/parser.js` | `src/parser/index.js` | Copy as-is |
| `src/util/parse/*` | `src/parser/utils/` | Copy all files |
| `src/engines/as3Converter.js` | `src/converters/as3/index.js` | Copy, remove NEXT refs |
| `src/engines/as3ClassicCleanUp.js` | `src/converters/as3/cleanup.js` | Copy as-is |
| `src/lib/AS3/convertEngine/` | `src/converters/as3/engine/` | Copy all |
| `src/lib/AS3/customMaps/` | `src/converters/as3/maps/` | Copy all |
| `src/lib/AS3/customDict.js` | `src/converters/as3/dict.js` | Copy as-is |
| `src/lib/AS3/as3Properties.js` | `src/converters/as3/properties.js` | Copy as-is |
| `src/engines/doConverter.js` | `src/converters/do/index.js` | Copy as-is |
| `src/lib/DO/*` | `src/converters/do/maps/` | Copy all |

### Supporting Utilities (Copy)

| Source | Destination |
|--------|-------------|
| `src/util/convert/*` | `src/utils/` (flatten structure) |
| `src/preConverter/inputReader.js` | `src/io/ucsReader.js` |
| `src/lib/validators/as3Classic.js` | `src/validators/as3.js` |
| `src/lib/bigipDefaults.json` | `src/data/defaults.json` |
| `src/constants.js` | `src/constants.js` (clean NEXT refs) |

### Test Files (Copy Selectively)

| Source | Destination |
|--------|-------------|
| `test/engines/parser.test.js` | `test/upstream/parser.test.js` |
| `test/engines/as3Converter.test.js` | `test/upstream/as3.test.js` |
| `test/engines/doConverter.test.js` | `test/upstream/do.test.js` |
| `test/fixtures/*` | `test/fixtures/` (relevant files only) |

### Files to SKIP

- ❌ `src/engines/as3NextCleanUp.js` - NEXT functionality
- ❌ `src/lib/validators/as3Next.js` - NEXT validation
- ❌ `src/server.js` - HTTP server (not needed)
- ❌ `init.js` - CLI wrapper (create simpler version)
- ❌ `src/lib/analytics.js` - F5 telemetry
- ❌ `src/processingLog/` - Complex logging
- ❌ All NEXT-related tests

---

## Target Structure

```
tmos-converter/
├── src/
│   ├── parser/
│   │   ├── index.js              # Main parser
│   │   └── utils/                # Parsing utilities
│   │
│   ├── converters/
│   │   ├── as3/
│   │   │   ├── index.js          # AS3 converter
│   │   │   ├── cleanup.js        # Post-processing
│   │   │   ├── engine/           # Conversion engine
│   │   │   ├── maps/             # Custom mappings
│   │   │   ├── dict.js           # Supported objects
│   │   │   └── properties.js     # AS3 properties
│   │   │
│   │   └── do/
│   │       ├── index.js          # DO converter
│   │       └── maps/             # DO mappings
│   │
│   ├── validators/
│   │   ├── as3.js                # AS3 Classic validator
│   │   └── do.js                 # DO validator
│   │
│   ├── io/
│   │   └── ucsReader.js          # UCS extraction
│   │
│   ├── utils/                    # Shared utilities
│   │   ├── ipUtils.js
│   │   ├── objectRef.js
│   │   ├── certificates.js
│   │   └── ...
│   │
│   ├── data/
│   │   └── defaults.json         # BIGIP defaults
│   │
│   └── constants.js              # Constants
│
├── schemas/                      # Bundled schemas
│   ├── as3-classic/
│   └── do/
│
├── test/
│   ├── upstream/                 # Copied from f5-acc
│   └── unit/                     # Our new tests
│
├── vendor/
│   └── f5-acc-1.126.0/          # Reference copy
│
├── index.js                      # Main API
├── package.json
├── README.md
├── UPSTREAM_SYNC.md             # Track sync with upstream
└── LICENSE
```

---

## Simple API Design

```javascript
// index.js
const parser = require('./src/parser');
const as3Converter = require('./src/converters/as3');
const doConverter = require('./src/converters/do');

module.exports = {
    // Core engines
    parse: (configText) => parser({ 'config': configText }),

    toAS3: async (json, options = {}) => as3Converter(json, options),

    toDO: (json, options = {}) => doConverter(json, options),

    // Convenience methods
    convertToAS3: async (configText, options = {}) => {
        const json = parser({ 'config': configText });
        return as3Converter(json, options);
    },

    convertToDO: (configText, options = {}) => {
        const json = parser({ 'config': configText });
        return doConverter(json, options);
    }
};
```

**Usage:**
```javascript
const tmos = require('tmos-converter');

// Simple conversion
const as3 = await tmos.convertToAS3(configText);

// Step-by-step
const json = tmos.parse(configText);
const as3 = await tmos.toAS3(json);
```

---

## Minimal Dependencies

```json
{
  "name": "tmos-converter",
  "version": "1.0.0",
  "description": "Convert F5 TMOS config to AS3 Classic and DO declarations",
  "main": "index.js",
  "dependencies": {
    "@automation-toolchain/f5-appsvcs-classic-schema": "1.4.0",
    "@automation-toolchain/f5-do": "1.43.0",
    "ajv": "^8.17.1",
    "deepmerge": "^4.3.1",
    "lodash": "^4.17.21",
    "tar": "^7.4.3"
  },
  "devDependencies": {
    "mocha": "^10.8.2",
    "chai": "^4.5.0"
  }
}
```

**Removed from original:**
- ❌ `@automation-toolchain/f5-appsvcs-schema` (AS3 NEXT)
- ❌ `express`, `multer` (HTTP server)
- ❌ `commander` (CLI)
- ❌ `@f5devcentral/f5-teem` (analytics)
- ❌ `winston` (complex logging)
- ❌ `uuid`, `semver` (not needed)

---

## Extraction Process

### Phase 1: Setup (Day 1)

```bash
cd /home/ted/tmos-converter

# Initialize git
git init
git add .
git commit -m "Initial structure"

# Copy source reference
cp -r /home/ted/accc vendor/f5-acc-1.126.0
```

### Phase 2: Copy Core Files (Days 2-3)

**Parser:**
```bash
mkdir -p src/parser/utils
cp ../accc/src/engines/parser.js src/parser/index.js
cp ../accc/src/util/parse/* src/parser/utils/
```

**AS3 Converter:**
```bash
mkdir -p src/converters/as3/{engine,maps}
cp ../accc/src/engines/as3Converter.js src/converters/as3/index.js
cp ../accc/src/engines/as3ClassicCleanUp.js src/converters/as3/cleanup.js
cp -r ../accc/src/lib/AS3/convertEngine/* src/converters/as3/engine/
cp -r ../accc/src/lib/AS3/customMaps/* src/converters/as3/maps/
cp ../accc/src/lib/AS3/customDict.js src/converters/as3/dict.js
cp ../accc/src/lib/AS3/as3Properties.js src/converters/as3/properties.js

# Remove NEXT references
grep -rl "next\|Next\|NEXT" src/converters/as3/ --include="*.js" | xargs sed -i '/next/d'
```

**DO Converter:**
```bash
mkdir -p src/converters/do/maps
cp ../accc/src/engines/doConverter.js src/converters/do/index.js
cp -r ../accc/src/lib/DO/* src/converters/do/maps/
```

**Utilities:**
```bash
mkdir -p src/utils src/io src/validators src/data
cp ../accc/src/util/convert/* src/utils/
cp ../accc/src/preConverter/inputReader.js src/io/ucsReader.js
cp ../accc/src/lib/validators/as3Classic.js src/validators/as3.js
cp ../accc/src/lib/bigipDefaults.json src/data/defaults.json
cp ../accc/src/constants.js src/constants.js
```

### Phase 3: Create API (Day 4)

Create `index.js` with simple API (see above).

Update all `require()` paths to match new structure.

### Phase 4: Copy Tests (Day 5)

```bash
mkdir -p test/upstream test/fixtures
cp ../accc/test/engines/parser.test.js test/upstream/
cp ../accc/test/engines/as3Converter.test.js test/upstream/
cp ../accc/test/engines/doConverter.test.js test/upstream/
# Copy relevant fixtures
```

Update test paths, remove NEXT assertions.

### Phase 5: Dependencies & Schemas (Days 6-7)

Copy schema tarballs:
```bash
mkdir -p schemas deps
cp ../accc/deps/f5-appsvcs-classic-schema-*.tgz deps/
cp ../accc/deps/f5-declarative-onboarding-*.tgz deps/
# Skip f5-appsvcs-schema (NEXT)
```

Create simplified prepack script or bundle schemas directly.

### Phase 6: Testing (Days 8-9)

```bash
npm install
npm test
```

Fix import paths, remove NEXT references, ensure tests pass.

### Phase 7: Documentation (Day 10)

- Create README with usage examples
- Document UPSTREAM_SYNC.md
- Add LICENSE (Apache-2.0)

---

## Upstream Sync Strategy

### Track Changes with Tests

1. **Copy upstream test suite** when extracting
2. **Store in `test/upstream/`** - unchanged
3. **When upstream releases new version:**
   - Download new f5-acc version
   - Copy new/updated tests to `test/upstream/`
   - Run tests against your code
   - **Test failures = changes to review**
   - Apply fixes if needed

### Sync Log Format

**File: `UPSTREAM_SYNC.md`**
```markdown
# Upstream Sync Log

## Current Sync
- **Version:** 1.126.0
- **Date:** 2025-11-13
- **Commit:** 05b0737713ef54caaf20da09524d10fa8a4ee86d

## Extracted Components
- ✅ Parser (src/engines/parser.js)
- ✅ AS3 Classic Converter (src/engines/as3Converter.js)
- ✅ DO Converter (src/engines/doConverter.js)
- ✅ All utilities from src/util/parse and src/util/convert
- ❌ AS3 NEXT (intentionally excluded)

## Next Sync Process
1. Download f5-acc v1.127.0
2. Copy new tests from test/engines/ to test/upstream/
3. Run: `npm test -- test/upstream/`
4. Review failures, apply fixes
5. Update this log
```

### Quarterly Check

```bash
# 1. Check for new upstream version
# 2. Download to vendor/f5-acc-<version>/
# 3. Copy tests
cp vendor/f5-acc-1.127.0/test/engines/*.test.js test/upstream/

# 4. Run tests
npm test -- test/upstream/

# 5. Investigate failures - they indicate changes
# 6. Apply fixes if needed
# 7. Update UPSTREAM_SYNC.md
```

---

## Key Differences from Original

### Simplified
- ❌ No HTTP server
- ❌ No CLI (can add later if needed)
- ❌ No analytics/telemetry
- ❌ No complex logging (use console)
- ❌ No AS3 NEXT support

### Improved
- ✅ Cleaner API
- ✅ Simpler dependencies
- ✅ Better structure (grouped by function)
- ✅ Easier to test
- ✅ Smaller package size

### Maintained
- ✅ Core conversion logic unchanged
- ✅ All AS3 Classic features
- ✅ All DO features
- ✅ UCS extraction
- ✅ Certificate handling

---

## Success Criteria

- [ ] Parser converts TMOS → JSON correctly
- [ ] AS3 converter produces valid AS3 Classic declarations
- [ ] DO converter produces valid DO declarations
- [ ] UCS archive extraction works
- [ ] Upstream tests pass (with NEXT tests removed)
- [ ] Package size < 2MB
- [ ] Only 2 schema dependencies (not 3)
- [ ] Simple API works as documented

---

## Estimated Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Setup | 1 day | Structure, git init |
| File copying | 2-3 days | Copy and organize source files |
| API creation | 1 day | Create index.js, update imports |
| Test setup | 1 day | Copy tests, update paths |
| Dependencies | 2 days | Schemas, package.json |
| Testing | 2 days | Run tests, fix issues |
| Documentation | 1 day | README, sync log |
| **Total** | **10-12 days** | **2 weeks** |

---

## Next Steps

1. ✅ Create directory structure
2. ⏳ Copy reference source to `vendor/`
3. ⏳ Copy core engine files
4. ⏳ Create API wrapper
5. ⏳ Copy and adapt tests
6. ⏳ Set up dependencies
7. ⏳ Run tests and fix issues
8. ⏳ Write documentation

---

*Plan created: 2025-11-13*
*For: tmos-converter v1.0.0*
*From: f5-automation-config-converter v1.126.0*
