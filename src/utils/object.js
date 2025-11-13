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

const lodashAssignDefaults = require('lodash/defaults');
const lodashCloneDeep = require('lodash/cloneDeep');
const lodashObjectGet = require('lodash/get');
const lodashObjectHas = require('lodash/has');
const lodashObjectSet = require('lodash/set');
const lodashObjectUnset = require('lodash/unset');

const constants = require('../constants');

/**
 * JS Object utils - helpers for Object, Array and etc.
 * Bridge between ACC and lodash (and other 3rd party libs)
 */

/**
 * Recursively clones value
 *
 * @public
 *
 * @param {Any} value - the value to recursively clone
 *
 * @returns {Any} the deep cloned value
 */
function cloneDeep(value) {
    return lodashCloneDeep(value);
}

/**
 * Gets the value at path of object. If the resolved value is undefined, the options.default is returned in its place
 *
 * Note:
 * - when options.separator specified then if leading and/or trailing chars of the paths match the separator then
 *   it will be stripped
 *
 * @public
 *
 * @param {Object} obj - the object to query
 * @param {Array | String} path - the path of the property to get
 * @param {Any} [options] - default value or options
 * @param {Any} [options.default] - if the resolved value is undefined, the options.default is returned in its place
 * @param {Integer} [options.depth] - max depth of the path, e.g. if set to 1 then for/a/b/c it will look for /a only.
 *  Ignored when the path is not an array or options.separator not specified
 * @param {String} [options.separator] - the path separator
 * @param {Boolean} [options.tmosPath = false] - TMOS path notation ('/' separator). When set to true
 *  options.separator will be overriden with constants.COMMON.TMOS_NAME_SEP
 *
 * @returns {Any} the resolved value
 */
function get(obj, path, options) {
    const hasOptions = !!(options && typeof options === 'object' && !Array.isArray(options));
    return lodashObjectGet(
        obj,
        parsePath(path, hasOptions ? options : {}),
        hasOptions ? options?.default : options
    );
}

/**
 * Checks if path is a direct property of object
 *
 * Note:
 * - when options.separator specified then if leading and/or trailing chars of the paths match the separator then
 *   it will be stripped
 *
 * @public
 *
 * @param {Object} obj - the object to query
 * @param {Array | String} path - the path of the property to get
 * @param {Object} [options] - options
 * @param {Integer} [options.depth] - max depth of the path, e.g. if set to 1 then for/a/b/c it will look for /a only.
 *  Ignored when the path is not an array or options.separator not specified
 * @param {String} [options.separator] - the path separator
 * @param {Boolean} [options.tmosPath = false] - TMOS path notation ('/' separator). When set to true
 *  options.separator will be overriden with constants.COMMON.TMOS.PATH_SEP
 *
 * @returns {Boolean} true if path exists, else false.
 */
function has(obj, path, options) {
    return lodashObjectHas(obj, parsePath(path, options));
}

/**
 * Sets the value at path of object. If a portion of path doesn't exist, it's created.
 * Arrays are created for missing index properties while objects are created for all other missing properties.
 *
 * Note:
 * - when options.separator specified then if leading and/or trailing chars of the paths match the separator then
 *   it will be stripped
 *
 * @public
 *
 * @param {Object} obj - the object to modify
 * @param {Array | String} path - the path of the property to set
 * @param {*} value - the value to set
 * @param {Object} [options] - options
 * @param {Integer} [options.depth] - max depth of the path, e.g. if set to 1 then for/a/b/c it will look for /a only.
 *  Ignored when the path is not an array or options.separator not specified
 * @param {String} [options.separator] - the path separator
 * @param {Boolean} [options.tmosPath = false] - TMOS path notation ('/' separator). When set to true
 *  options.separator will be overriden with constants.COMMON.TMOS_NAME_SEP
 *
 * @returns {Object} returns object
 */
function set(obj, path, value, options) {
    return lodashObjectSet(obj, parsePath(path, options), value);
}

/**
 * Removes the property at path of object.
 *
 * Note:
 * - when options.separator specified then if leading and/or trailing chars of the paths match the separator then
 *   it will be stripped
 * - can't unset Array items
 *
 * @public
 *
 * @param {Object} obj - the object to query
 * @param {Array | String} path - the path of the property to unset
 * @param {Object} [options] - options
 * @param {Integer} [options.depth] - max depth of the path, e.g. if set to 1 then for/a/b/c it will look for /a only.
 *  Ignored when the path is not an array or options.separator not specified
 * @param {String} [options.separator] - the path separator
 * @param {Boolean} [options.tmosPath = false] - TMOS path notation ('/' separator). When set to true
 *  options.separator will be overriden with constants.COMMON.TMOS_NAME_SEP
 *
 * @returns {Boolean} true if the property is deleted, else false
 */
function unset(obj, path, options) {
    return lodashObjectUnset(obj, parsePath(path, options));
}

/**
 * Parse the path of the property
 *
 * Note:
 * - when options.separator specified then if leading and/or trailing chars of the paths match the separator then
 *   it will be stripped
 * - when `depth` set to 0 then `path` will be treated as `empty path`
 *
 * @private
 *
 * @param {Array | String | Number} path - the path of the property
 * @param {Object} [options] - options
 * @param {Integer} [options.depth] - max depth of the path, e.g. if set to 1 then for/a/b/c it will look for /a only
 * @param {String} [options.separator] - the path separator
 * @param {Boolean} [options.tmosPath = false] - TMOS path notation ('/' separator). When set to true
 *  options.separator will be overriden with constants.COMMON.TMOS.PATH_SEP
 *
 * @returns {Array} the parsed path
 */
function parsePath(path, options) {
    options = lodashAssignDefaults({}, options || {}, { tmosPath: false });
    if (options.tmosPath) {
        options.separator = constants.COMMON.TMOS.PATH_SEP;
    }
    if (typeof path === 'string') {
        if (typeof options.separator === 'string') {
            // remove leading and trailing separators
            path = path.slice(
                path.startsWith(options.separator) ? 1 : 0,
                path.endsWith(options.separator) ? -1 : undefined
            );
            path = path.split(options.separator);
        }
    } else if (!Array.isArray(path)) {
        // cast to array with single item - single key
        path = [`${path}`];
    }
    if (Array.isArray(path) && Object.hasOwn(options, 'depth')) {
        path = path.slice(0, options.depth);
    }
    return path;
}

/**
 * Generate unique property name if needed
 *
 * @public
 *
 * @param {string} key - key to check, it may not exist in the object
 * @param {object} data - data
 * @param {options} [options] - options
 * @param {string} [options.separator = '_'] - ID separator
 *
 * @returns {stirng} unique key
 */
function uniqueProperty(key, data, options) {
    if (has(data, [key])) {
        options = options || {};
        const sep = options.separator || '_';
        // use 1 as base, easier to read declaration
        for (let i = 1; ; i += 1) {
            const compKey = `${key}${sep}${i}`;
            // key should not exist in the object or
            // the origin key was generated that is acceptable
            if (!has(data, [compKey])) {
                key = compKey;
                break;
            }
        }
    }
    return key;
}

module.exports = {
    cloneDeep,
    get,
    has,
    set,
    uniqueProperty,
    unset
};
