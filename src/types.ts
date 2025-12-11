/**
 * TMOS Converter Types
 *
 * Type definitions for all public API options and results.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Logging context for detailed AS3 conversion tracking.
 * Implement these methods to capture property transformation events.
 */
export interface RequestContext {
    /** Called when a TMOS property is skipped during conversion */
    logSkipTmshProperty?: (data: { property: string; reason?: string }) => void;
    /** Called when a property is renamed during conversion */
    logRenameProperty?: (data: { from: string; to: string }) => void;
    /** Called when a property is removed during conversion */
    logRemoveProperty?: (data: { property: string; reason?: string }) => void;
    /** Called when an object is renamed to avoid conflicts */
    logRenamedProperty?: (data: { from: string; to: string }) => void;
}

/**
 * Options for AS3 conversion.
 *
 * @example Basic conversion (defaults)
 * ```typescript
 * const result = await tmos.convertToAS3(config);
 * ```
 *
 * @example With debug controls
 * ```typescript
 * const result = await tmos.convertToAS3(config, { controls: true });
 * ```
 *
 * @example Strip route domains for simpler migration
 * ```typescript
 * const result = await tmos.convertToAS3(config, { stripRouteDomains: true });
 * ```
 */
export interface AS3ConversionOptions {
    /**
     * Add AS3 Controls class to declaration for debugging.
     * When enabled, adds trace logging and debug level to the declaration.
     * @default false
     */
    controls?: boolean;

    /**
     * Skip TMOS conversion, only run AS3 cleanup/validation.
     * Use when you already have an AS3 declaration and want to clean invalid refs.
     * @default false
     */
    skipTMOSConvertProcess?: boolean;

    /**
     * Remove route domain suffixes from all IP addresses.
     * Strips `%<number>` from IPs (e.g., `192.168.1.10%1` → `192.168.1.10`).
     * Useful when migrating from multi-route-domain environments.
     * @default false
     */
    stripRouteDomains?: boolean;

    /**
     * Enable structured JSON logging via requestContext.
     * Must be used with requestContext to receive callbacks.
     * @default false
     */
    jsonLogs?: boolean;

    /**
     * Custom logging context for audit trails.
     * Only active when jsonLogs is true.
     */
    requestContext?: RequestContext;

    /**
     * @deprecated AS3 Next is not supported in this converter. Always use Classic.
     * @default false
     */
    next?: boolean;

    /**
     * @deprecated No effect - legacy option preserved for compatibility.
     * @default false
     */
    disableAnalytics?: boolean;
}

/**
 * Options for DO (Declarative Onboarding) conversion.
 *
 * @example Basic conversion
 * ```typescript
 * const result = tmos.convertToDO(config);
 * ```
 *
 * @example With debug controls
 * ```typescript
 * const result = tmos.convertToDO(config, { controls: true });
 * ```
 */
export interface DOConversionOptions {
    /**
     * Add DO Controls class to declaration for debugging.
     * When enabled, adds trace logging and dry-run capability.
     * @default false
     */
    controls?: boolean;
}

/**
 * Result from AS3 conversion.
 */
export interface AS3ConversionResult {
    /** The converted AS3 Classic declaration */
    declaration: Record<string, any>;

    /** List of iApp templates that were successfully converted */
    iappSupported: string[];

    /** Objects that could not be converted (unsupported types) */
    as3NotConverted: Record<string, any>;

    /** Objects that were not recognized by the parser */
    as3NotRecognized: Record<string, any>;

    /** Keys removed during AS3 Classic cleanup (not supported by schema) */
    keyClassicNotSupported: string[];

    /** Map of renamed objects (newName → oldName) to avoid conflicts */
    renamedDict: Record<string, string>;

    /** Count of unsupported objects by type */
    unsupportedStats: Record<string, number>;
}

/**
 * Result from DO conversion.
 */
export interface DOConversionResult {
    /** The converted DO declaration */
    declaration: Record<string, any>;
}

/**
 * Parsed TMOS configuration as intermediate JSON.
 */
export type ParsedConfig = Record<string, any>;

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Options for AS3 validation.
 */
export interface AS3ValidationOptions {
    /**
     * Validation mode:
     * - `'lazy'` (default): Identifies all invalid properties that would need removal
     * - `'strict'`: Fails on first validation error
     * @default 'lazy'
     */
    mode?: 'lazy' | 'strict';
}

/**
 * A single validation error from schema validation.
 */
export interface ValidationError {
    /** The validation keyword that failed (e.g., 'type', 'required', 'additionalProperties') */
    keyword: string;
    /** JSON path to the invalid data (AJV v6 style) */
    dataPath?: string;
    /** JSON path to the invalid data (AJV v7+ style) */
    instancePath?: string;
    /** JSON path to the schema rule that failed */
    schemaPath?: string;
    /** Additional parameters about the error */
    params?: Record<string, any>;
    /** Human-readable error message */
    message?: string;
}

/**
 * Result from AS3 schema validation.
 *
 * @example
 * ```typescript
 * const result = await tmos.validateAS3(declaration);
 * if (!result.isValid) {
 *     console.error('Errors:', result.errors);
 *     console.error('Ignored attributes:', result.ignoredAttributes);
 * }
 * ```
 */
export interface AS3ValidationResult {
    /** Whether the declaration is valid according to the AS3 schema */
    isValid: boolean;
    /** The (possibly modified) declaration data - in lazy mode, invalid properties are removed */
    data: Record<string, any>;
    /** Validation errors */
    errors: ValidationError[];
    /** List of attributes that were ignored/removed (lazy mode only) */
    ignoredAttributes?: string[];
    /** Errors for ignored attributes (lazy mode only) */
    ignoredAttributesErrors?: ValidationError[];
}

/**
 * Result from DO schema validation.
 *
 * @example
 * ```typescript
 * const result = await tmos.validateDO(declaration);
 * if (!result.isValid) {
 *     console.error('Errors:', result.errors);
 * }
 * ```
 */
export interface DOValidationResult {
    /** Whether the declaration is valid according to the DO schema */
    isValid: boolean;
    /** Validation errors if invalid (null if valid) */
    errors: ValidationError[] | null;
}

/**
 * Schema version information.
 */
export interface SchemaVersionInfo {
    /** Latest supported schema version */
    latest: string;
    /** Earliest supported schema version */
    earliest: string;
}
