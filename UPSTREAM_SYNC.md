# Upstream Synchronization Log

Track changes from the upstream ACC project.

---

## Extracted Components

### Core Engines

| Component | Status | Modified |
|-----------|--------|----------|
| Parser | Copied | No |
| AS3 Converter | Copied | Yes (NEXT removed) |
| AS3 Cleanup | Copied | No |
| DO Converter | Copied | No |

### Intentionally Excluded

- AS3 NEXT support
- HTTP server
- CLI tool
- Analytics/telemetry

---

## Known Modifications

### AS3 Converter

- Removed all references to `as3NextCleanUp`
- Removed NEXT tracking variables
- Removed NEXT metadata from return object

### Constants

- Removed AS3 NEXT schema version constants
- Removed NEXT-related feature flags

---

## Sync History

### Initial Extraction (2025-11-13)

- Extracted core engines
- Removed AS3 NEXT support
- Simplified dependencies
- Created standalone API

---

*Last updated: 2025-11-13*
