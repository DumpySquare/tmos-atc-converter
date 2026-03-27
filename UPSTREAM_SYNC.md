# Upstream Synchronization Log

Track changes from upstream f5-automation-config-converter project.

---

## Current Sync Status

- **Upstream Repository:** https://github.com/f5devcentral/f5-automation-config-converter
- **Upstream Version:** 1.126.0
- **Upstream Commit:** 05b0737713ef54caaf20da09524d10fa8a4ee86d
- **Sync Date:** 2025-11-13
- **Our Version:** 1.0.0

---

## Extracted Components

### Core Engines

| Component | Source File | Our Location | Status | Modified |
|-----------|-------------|--------------|--------|----------|
| Parser | `src/engines/parser.js` | `src/parser/index.js` | ✅ Copied | No |
| AS3 Converter | `src/engines/as3Converter.js` | `src/converters/as3/index.js` | ✅ Copied | Yes (NEXT removed) |
| AS3 Cleanup | `src/engines/as3ClassicCleanUp.js` | `src/converters/as3/cleanup.js` | ✅ Copied | No |
| DO Converter | `src/engines/doConverter.js` | `src/converters/do/index.js` | ✅ Copied | No |

### Supporting Libraries

| Component | Source | Our Location | Status |
|-----------|--------|--------------|--------|
| Parse utilities | `src/util/parse/` | `src/parser/utils/` | ✅ Copied |
| Convert utilities | `src/util/convert/` | `src/utils/` | ✅ Copied |
| AS3 engine | `src/lib/AS3/convertEngine/` | `src/converters/as3/engine/` | ✅ Copied |
| AS3 maps | `src/lib/AS3/customMaps/` | `src/converters/as3/maps/` | ✅ Copied |
| DO maps | `src/lib/DO/` | `src/converters/do/maps/` | ✅ Copied |
| UCS reader | `src/preConverter/inputReader.js` | `src/io/ucsReader.js` | ✅ Copied |
| AS3 validator | `src/lib/validators/as3Classic.js` | `src/validators/as3.js` | ✅ Copied |

### Intentionally Excluded

- ❌ `src/engines/as3NextCleanUp.js` - AS3 NEXT support
- ❌ `src/lib/validators/as3Next.js` - AS3 NEXT validation
- ❌ `src/server.js` - HTTP server
- ❌ `init.js` - CLI tool
- ❌ `src/lib/analytics.js` - F5 telemetry
- ❌ `src/processingLog/` - Complex logging

---

## Known Modifications

### 1. AS3 Converter (`src/converters/as3/index.js`)

**Changes:**
- Removed all references to `as3NextCleanUp`
- Removed NEXT tracking variables
- Removed NEXT metadata from return object

**Reason:** We only support AS3 Classic, not AS3 NEXT

### 2. Constants (`src/constants.js`)

**Changes:**
- Removed AS3 NEXT schema version constants
- Removed NEXT-related feature flags

---

## Upstream Sync Process

### When Upstream Releases New Version

1. **Download new version**
   ```bash
   cd /path/to/upstream-f5-acc
   git pull
   git checkout v1.127.0  # new version tag
   ```

2. **Copy new/updated tests**
   ```bash
   cp test/engines/parser.test.js /path/to/tmos-atc-converter/test/upstream/
   cp test/engines/as3Converter.test.js /path/to/tmos-atc-converter/test/upstream/
   cp test/engines/doConverter.test.js /path/to/tmos-atc-converter/test/upstream/
   ```

3. **Run tests against our code**
   ```bash
   cd /path/to/tmos-atc-converter
   npm run test:upstream
   ```

4. **Investigate failures**
   - Test failures indicate functional changes in upstream
   - Review upstream commit history for relevant changes
   - Determine if we need to incorporate fixes

5. **Apply fixes (if needed)**
   - Cherry-pick relevant bug fixes
   - Update our code to match new behavior
   - Re-run tests to verify

6. **Update this log**
   ```markdown
   ## Sync: v1.127.0 (2025-12-15)
   - Applied bug fix for iRule parsing (commit abc123)
   - No breaking changes
   ```

### Test-Based Change Detection

The upstream test suite serves as our specification. When tests fail:
- ✅ Indicates functional change
- ✅ Pinpoints exact behavior difference
- ✅ Provides expected output

This is more reliable than code diffing.

---

## Sync History

### v1.126.0 - Initial Extraction (2025-11-13)

- Extracted core engines from f5-acc
- Removed AS3 NEXT support
- Simplified dependencies
- Created standalone API

**Files copied:** 50+
**Lines of code:** ~15,000
**Tests copied:** 20+

---

## Next Sync

**Scheduled:** Quarterly (or when new upstream version released)
**Next Check Date:** 2026-02-13

---

*Last updated: 2025-11-13*
