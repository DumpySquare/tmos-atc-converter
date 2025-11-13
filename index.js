/**
 * TMOS Converter - Main API
 *
 * Extract and convert F5 TMOS configuration to AS3 Classic or DO declarations
 *
 * Source: f5-automation-config-converter v1.126.0
 * License: Apache-2.0
 */

'use strict';

const parser = require('./src/parser');
const as3Converter = require('./src/converters/as3');
const doConverter = require('./src/converters/do');

/**
 * Parse TMOS configuration text to intermediate JSON
 *
 * @param {string} configText - TMOS configuration text
 * @returns {Object} Parsed JSON representation
 */
function parse(configText) {
    return parser({ 'config': configText });
}

/**
 * Convert parsed JSON to AS3 Classic declaration
 *
 * @param {Object} json - Parsed TMOS JSON
 * @param {Object} [options={}] - Conversion options
 * @returns {Promise<Object>} AS3 declaration with metadata
 */
async function toAS3(json, options = {}) {
    return as3Converter(json, options);
}

/**
 * Convert parsed JSON to DO declaration
 *
 * @param {Object} json - Parsed TMOS JSON
 * @param {Object} [options={}] - Conversion options
 * @returns {Object} DO declaration
 */
function toDO(json, options = {}) {
    return doConverter(json, options);
}

/**
 * Parse TMOS config and convert directly to AS3 Classic
 *
 * @param {string} configText - TMOS configuration text
 * @param {Object} [options={}] - Conversion options
 * @returns {Promise<Object>} AS3 declaration with metadata
 */
async function convertToAS3(configText, options = {}) {
    const json = parse(configText);
    return toAS3(json, options);
}

/**
 * Parse TMOS config and convert directly to DO
 *
 * @param {string} configText - TMOS configuration text
 * @param {Object} [options={}] - Conversion options
 * @returns {Object} DO declaration
 */
function convertToDO(configText, options = {}) {
    const json = parse(configText);
    return toDO(json, options);
}

module.exports = {
    // Core engine access
    parse,
    toAS3,
    toDO,

    // Convenience methods
    convertToAS3,
    convertToDO
};
