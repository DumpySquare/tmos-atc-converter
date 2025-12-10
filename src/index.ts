/**
 * TMOS Converter - Main API
 *
 * Extract and convert F5 TMOS configuration to AS3 Classic or DO declarations
 *
 * Source: f5-automation-config-converter v1.126.0
 * License: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

const parser = require('./parser');
const as3Converter = require('./converters/as3');
const doConverter = require('./converters/do');

// Temporary types until full migration - these will be refined
export interface ConversionOptions {
    [key: string]: any;
}

export interface ParsedConfig {
    [key: string]: any;
}

export interface AS3Result {
    declaration: any;
    [key: string]: any;
}

export interface DOResult {
    declaration: any;
    [key: string]: any;
}

/**
 * Parse TMOS configuration text to intermediate JSON
 *
 * @param configText - TMOS configuration text
 * @returns Parsed JSON representation
 */
export function parse(configText: string): ParsedConfig {
    return parser({ config: configText });
}

/**
 * Convert parsed JSON to AS3 Classic declaration
 *
 * @param json - Parsed TMOS JSON
 * @param options - Conversion options
 * @returns AS3 declaration with metadata
 */
export async function toAS3(json: ParsedConfig, options: ConversionOptions = {}): Promise<AS3Result> {
    return as3Converter(json, options);
}

/**
 * Convert parsed JSON to DO declaration
 *
 * @param json - Parsed TMOS JSON
 * @param options - Conversion options
 * @returns DO declaration
 */
export function toDO(json: ParsedConfig, options: ConversionOptions = {}): DOResult {
    return doConverter(json, options);
}

/**
 * Parse TMOS config and convert directly to AS3 Classic
 *
 * @param configText - TMOS configuration text
 * @param options - Conversion options
 * @returns AS3 declaration with metadata
 */
export async function convertToAS3(configText: string, options: ConversionOptions = {}): Promise<AS3Result> {
    const json = parse(configText);
    return toAS3(json, options);
}

/**
 * Parse TMOS config and convert directly to DO
 *
 * @param configText - TMOS configuration text
 * @param options - Conversion options
 * @returns DO declaration
 */
export function convertToDO(configText: string, options: ConversionOptions = {}): DOResult {
    const json = parse(configText);
    return toDO(json, options);
}

// CommonJS compatibility
module.exports = {
    parse,
    toAS3,
    toDO,
    convertToAS3,
    convertToDO,
};
