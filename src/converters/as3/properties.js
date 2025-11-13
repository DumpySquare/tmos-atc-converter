/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const AS3Properties = require('@automation-toolchain/f5-appsvcs-classic-schema/properties');
const AS3PropertiesAddtnl = require('./as3PropertiesCustom.json');

const log = require('../../util/log');
const objectUtil = require('../../util/object');

/**
 * Remove data related to special handling from ACC
 *
 * @param {object} def - definition
 *
 * @returns {object}
 */
function cleanupDefinition(def) {
    return Object.fromEntries(
        Object.entries(def)
            .filter(([key]) => !key.startsWith('acc'))
    );
}

/**
 * Find parent class if defined
 *
 * @param {Array<object>} definitions - list of AS3 properties definitions
 *
 * @returns {string} parent class
 */
function findParentClass(definitions) {
    const mergeConf = definitions.find((def) => Object.keys(def).length === 2
        && def.accMergeMode === 'inherit' && objectUtil.has(def, 'inheritFrom'));
    return mergeConf?.inheritFrom;
}

/**
 * Merge definitions
 *
 * Note:
 * - mutates `dst`
 *
 * @param {object} src - definition
 * @param {object} dst - definition to merge to
 *
 * @returns {object} merged definition
 */
function mergeDefinitions(src, dst) {
    if (!objectUtil.has(src, 'accMergeMode')) {
        // NOTE: overrides existing properties
        dst = src;
    } else if (src.accMergeMode === 'extend') {
        Object.assign(dst, src);
    }
    delete dst.accMergeMode;
    return dst;
}

/**
 * Merge definitions arrays
 *
 * Note:
 * - mutates `dst`
 * - drops definitions without `id` property
 *
 * @param {Array<object>} src - definitions
 * @param {Array<object>} dst - definitions to merge to
 *
 * @returns {Array<object>} merged definitions
 */
function mergeDefinitionsArray(src, dst) {
    const definitionsMap = Object.fromEntries(dst.map((def, idx) => [def.id, idx]));
    src.forEach((def) => {
        if (!objectUtil.has(def, 'id')) {
            return;
        }
        if (objectUtil.has(definitionsMap, [def.id])) {
            const idx = definitionsMap[def.id];
            dst[idx] = cleanupDefinition(
                mergeDefinitions(def, dst[idx])
            );
        } else {
            dst.push(cleanupDefinition(def));
            definitionsMap[def.id] = dst.length - 1;
        }
    });
    return dst;
}

/**
 * Check if array of definitions requires special handling from ACC
 *
 * @param {Array<object>} definitions - definitions
 *
 * @returns {boolean} true if special handling required
 */
function requiresAccHandling(definitions) {
    return definitions.every((def) => Object.keys(def)
        .some((key) => key.startsWith('acc')));
}

/**
 * Normalize key: remove extra spaces
 *
 * Example:
 * in: <space>ltm<space><space>pool<space>
 * out: ltm<space>pool
 *
 * @param {string} key - key to normalize
 *
 * @returns {string} normailzed key
 */
function normalizeKey(key) {
    return key.split(/\s+/)
        .filter((x) => x)
        .join(' ');
}

/**
 * @throws {Error} error message
 */
function throwError(errMsg) {
    throw new Error(`${__dirname}/${__filename}: ${errMsg}`);
}

/**
 * Merge AS3 Properties with additional properties required for ACC convertion
 *
 * @returns {object} merged set of properties
 */
function mergeProperties() {
    const AS3Props = objectUtil.cloneDeep(AS3Properties);
    const AS3Addtnl = objectUtil.cloneDeep(AS3PropertiesAddtnl);

    const all = {};
    const inheritance = {};

    // AS3 default properties first as source of truth
    Object.entries(AS3Props).forEach(([key, definitions]) => {
        const normKey = normalizeKey(key);
        // use warning messages instead of throwing errors for AS3 pkg
        if (key !== normKey) {
            log.warn(`Key "${key}" is different from normalized "${normKey}" (f5-as3/properties)`);
        }
        if (definitions.length === 0) {
            log.warn(`Ignoring "${key}" (empty definitions array in f5-as3/properties)`);
        } else {
            all[normKey] = definitions;

            const existingIDs = new Set();
            definitions.forEach((def, idx) => {
                if (objectUtil.has(def, 'id')) {
                    if (existingIDs.has(def.id)) {
                        log.warn(`Found duplicated definition "${def.id}" in list of definitions for "${key}" (f5-as3/properties)`);
                    } else {
                        existingIDs.add(def.id);
                    }
                } else {
                    log.warn(`Definition at index ${idx} in list of definitions for "${key}" has no "id" (f5-as3/properties)`);
                }
            });
        }
    });

    // ACC additional properties
    Object.entries(AS3Addtnl).forEach(([key, definitions]) => {
        const normKey = normalizeKey(key);
        if (key !== normKey) {
            throwError(`Key "${key}" is different from normalized "${normKey}" (as3PropertiesCustom.json)`);
        }

        const exists = objectUtil.has(all, [normKey]);
        const requiresSpecialHandling = requiresAccHandling(definitions);

        if (exists && !requiresSpecialHandling) {
            // no special processing defined, can't merge it without guidance
            throwError(`Key "${key}" is defined in AS3 properties already! (as3PropertiesCustom.json)`);
        } else if (definitions.length === 0) {
            throwError(`Key "${key}" is unique and has empty definitions array (as3PropertiesCustom.json)`);
        }

        const existingIDs = new Set();
        definitions.forEach((def) => {
            if (objectUtil.has(def, 'id')) {
                if (existingIDs.has(def.id)) {
                    throwError(`Found duplicated definition "${def.id}" in list of definitions for "${key}" (as3PropertiesCustom.json)`);
                } else {
                    existingIDs.add(def.id);
                }
            }
        });

        const inheritFrom = findParentClass(definitions);
        if (!inheritFrom && requiresSpecialHandling) {
            definitions = mergeDefinitionsArray(
                definitions,
                // copy destination data because source is clonned already
                // (see first lines of the function)
                objectUtil.cloneDeep(exists ? all[normKey] : [])
            );
        }

        // save definitions despite on inheritance or existing data
        all[normKey] = definitions;

        // check for inheritance
        if (inheritFrom) {
            inheritance[normKey] = [inheritFrom];
        }
    });

    /**
     * Build inheritance chain for every class.
     * `inheritance` structure:
     * {
     *   'gtm monitor http': ['gtm monitor']
     * }
     */
    Object.entries(inheritance)
        .forEach(([childClass, chain]) => {
            chain = [childClass].concat(chain);
            let parentClass = chain.at(-1);

            while (objectUtil.has(inheritance, parentClass)) {
                inheritance[parentClass].forEach((clsName) => {
                    if (chain.includes(clsName)) {
                        throwError(`Circular inheritance: ${chain.concat([clsName]).join(' -> ')} (as3PropertiesCustom.json)`);
                    }
                    chain.push(clsName);
                });
                parentClass = chain.at(-1);
            }
            inheritance[childClass] = chain.slice(1);
        });

    /**
     * Build inheritance chain for every class.
     * `inheritance` structure:
     * {
     *   'gtm monitor http': ['gtm monitor'],
     *   'child': ['parent1', 'parent-of-parent1']
     * }
     */
    const sortedInheritance = Object.entries(inheritance);
    // sort by chain length
    sortedInheritance.sort((a, b) => a[1].length - b[1].length);
    // build definitions using inheritance info
    sortedInheritance.forEach(([childClass, chain]) => {
        let definitions = [];

        [childClass].concat(chain)
            .reverse()
            .forEach((objClass) => {
                if (!objectUtil.has(all, objClass)) {
                    throwError(`Key "${childClass}" refers to unknown "${objClass}" in its inheritance chain: ${chain.concat([childClass]).join(' <- ')} (as3PropertiesCustom.json)`);
                }
                definitions = mergeDefinitionsArray(
                    // copy source data because destionation is clonned already
                    objectUtil.cloneDeep(all[objClass]),
                    definitions
                );
            });

        all[childClass] = definitions;
    });

    return all;
}

/**
 * AS3MergedProperties class to store merged set of data (instead of global scope)
 */
class AS3MergedProperties {
    /** @type {object} */
    static #mergedProperties = null;

    /**
     * Merge AS3 Properties with additional properties required for ACC convertion
     *
     * @returns {object} merged set of properties
     */
    static getMergedProperties() {
        if (!this.#mergedProperties) {
            this.#mergedProperties = mergeProperties();
        }
        return this.#mergedProperties;
    }
}

/**
 * Merge AS3 Properties with additional properties required for ACC convertion
 *
 * @returns {object} merged set of properties
 */
module.exports = function getMergedProperties() {
    return AS3MergedProperties.getMergedProperties();
};
