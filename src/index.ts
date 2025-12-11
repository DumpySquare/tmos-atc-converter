/**
 * TMOS Converter - Main API
 *
 * Convert F5 TMOS configuration to AS3 Classic or DO declarations.
 * Includes standalone validation for use in MCP servers and other tools.
 *
 * @example Basic AS3 conversion
 * ```typescript
 * import * as tmos from 'tmos-converter';
 *
 * const config = `ltm pool /Common/web_pool {
 *     members {
 *         /Common/192.168.1.10:80 { }
 *     }
 * }`;
 *
 * const result = await tmos.convertToAS3(config);
 * console.log(result.declaration);
 * ```
 *
 * @example Standalone validation (for AI-modified declarations)
 * ```typescript
 * const result = await tmos.validateAS3(declaration);
 * if (!result.valid) {
 *     console.error('Invalid:', result.errors);
 * }
 * ```
 *
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import type {
    AS3ConversionOptions,
    AS3ConversionResult,
    AS3ValidationOptions,
    AS3ValidationResult,
    DOConversionOptions,
    DOConversionResult,
    DOValidationResult,
    ParsedConfig,
    RequestContext,
    SchemaVersionInfo,
    ValidationError,
} from './types';

// Re-export all types for consumers
export type {
    AS3ConversionOptions,
    AS3ConversionResult,
    AS3ValidationOptions,
    AS3ValidationResult,
    DOConversionOptions,
    DOConversionResult,
    DOValidationResult,
    ParsedConfig,
    RequestContext,
    SchemaVersionInfo,
    ValidationError,
};

const parser = require('./parser');
const as3Converter = require('./converters/as3');
const doConverter = require('./converters/do');
const as3Validator = require('./validators/as3');
const doValidator = require('./validators/do');

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Parse TMOS configuration text to intermediate JSON.
 *
 * @param configText - Raw TMOS configuration text (bigip.conf format)
 * @returns Parsed JSON representation of the configuration
 *
 * @example
 * ```typescript
 * const json = tmos.parse(`ltm pool /Common/pool1 { members { /Common/10.0.1.10:80 { } } }`);
 * console.log(json['ltm pool /Common/pool1']);
 * ```
 */
export function parse(configText: string): ParsedConfig {
    return parser({ config: configText });
}

/**
 * Convert parsed JSON to AS3 Classic declaration.
 *
 * @param json - Parsed TMOS JSON (from `parse()`)
 * @param options - Conversion options
 * @returns AS3 declaration with conversion metadata
 *
 * @example
 * ```typescript
 * const json = tmos.parse(config);
 * const result = await tmos.toAS3(json, { controls: true });
 * ```
 */
export async function toAS3(
    json: ParsedConfig,
    options: AS3ConversionOptions = {}
): Promise<AS3ConversionResult> {
    return as3Converter(json, options);
}

/**
 * Convert parsed JSON to DO (Declarative Onboarding) declaration.
 *
 * @param json - Parsed TMOS JSON (from `parse()`)
 * @param options - Conversion options
 * @returns DO declaration
 *
 * @example
 * ```typescript
 * const json = tmos.parse(config);
 * const result = tmos.toDO(json, { controls: true });
 * ```
 */
export function toDO(
    json: ParsedConfig,
    options: DOConversionOptions = {}
): DOConversionResult {
    return { declaration: doConverter(json, options) };
}

/**
 * Parse TMOS config and convert directly to AS3 Classic (one-step).
 *
 * @param configText - Raw TMOS configuration text
 * @param options - Conversion options
 * @returns AS3 declaration with conversion metadata
 *
 * @example Basic conversion
 * ```typescript
 * const result = await tmos.convertToAS3(config);
 * console.log(result.declaration);
 * ```
 *
 * @example With options
 * ```typescript
 * const result = await tmos.convertToAS3(config, {
 *     controls: true,
 *     stripRouteDomains: true
 * });
 * ```
 */
export async function convertToAS3(
    configText: string,
    options: AS3ConversionOptions = {}
): Promise<AS3ConversionResult> {
    const json = parse(configText);
    return toAS3(json, options);
}

/**
 * Parse TMOS config and convert directly to DO (one-step).
 *
 * @param configText - Raw TMOS configuration text
 * @param options - Conversion options
 * @returns DO declaration
 *
 * @example
 * ```typescript
 * const result = tmos.convertToDO(config, { controls: true });
 * console.log(result.declaration);
 * ```
 */
export function convertToDO(
    configText: string,
    options: DOConversionOptions = {}
): DOConversionResult {
    const json = parse(configText);
    return toDO(json, options);
}

// ============================================================================
// Validation Functions (for MCP servers and standalone validation)
// ============================================================================

/**
 * Validate an AS3 declaration against the AS3 Classic schema.
 *
 * Use this to validate declarations independently of conversion,
 * e.g., after AI modifications in an MCP server.
 *
 * @param declaration - AS3 declaration object to validate
 * @param options - Validation options
 * @returns Validation result with `valid` flag and any `errors`
 *
 * @example Basic validation
 * ```typescript
 * const result = await tmos.validateAS3(declaration);
 * if (!result.valid) {
 *     console.error('Validation errors:', result.errors);
 * }
 * ```
 *
 * @example Strict mode (fail on first error)
 * ```typescript
 * const result = await tmos.validateAS3(declaration, { mode: 'strict' });
 * ```
 */
export async function validateAS3(
    declaration: Record<string, unknown>,
    options: AS3ValidationOptions = {}
): Promise<AS3ValidationResult> {
    return as3Validator.validate(declaration, options);
}

/**
 * Validate a DO declaration against the Declarative Onboarding schema.
 *
 * Use this to validate declarations independently of conversion,
 * e.g., after AI modifications in an MCP server.
 *
 * @param declaration - DO declaration object to validate
 * @returns Validation result with `isValid` flag and any `errors`
 *
 * @example
 * ```typescript
 * const result = await tmos.validateDO(declaration);
 * if (!result.isValid) {
 *     console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export async function validateDO(
    declaration: Record<string, unknown>
): Promise<DOValidationResult> {
    return doValidator.validate(declaration);
}

/**
 * Get AS3 schema version information.
 *
 * @returns Object with `latest` and `earliest` supported schema versions
 *
 * @example
 * ```typescript
 * const versions = tmos.getAS3SchemaVersion();
 * console.log(`Latest: ${versions.latest}, Earliest: ${versions.earliest}`);
 * ```
 */
export function getAS3SchemaVersion(): SchemaVersionInfo {
    return as3Validator.getSchemaVersion();
}

// CommonJS compatibility
module.exports = {
    // Conversion
    parse,
    toAS3,
    toDO,
    convertToAS3,
    convertToDO,
    // Validation
    validateAS3,
    validateDO,
    getAS3SchemaVersion,
};
