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

import lodashAssignDefaults from 'lodash/defaults';
import lodashCloneDeep from 'lodash/cloneDeep';
import lodashObjectGet from 'lodash/get';
import lodashObjectHas from 'lodash/has';
import lodashObjectSet from 'lodash/set';
import lodashObjectUnset from 'lodash/unset';

import constants from '../constants';

/**
 * JS Object utils - helpers for Object, Array and etc.
 * Bridge between ACC and lodash (and other 3rd party libs)
 */

export interface PathOptions {
    default?: unknown;
    depth?: number;
    separator?: string;
    tmosPath?: boolean;
}

export interface UniquePropertyOptions {
    separator?: string;
}

type PathType = string | number | (string | number)[];

/**
 * Parse the path of the property
 */
function parsePath(path: PathType, options?: PathOptions): (string | number)[] {
    const opts = lodashAssignDefaults({}, options ?? {}, { tmosPath: false }) as PathOptions;
    let result: (string | number)[];

    if (opts.tmosPath) {
        opts.separator = constants.COMMON.TMOS.PATH_SEP;
    }
    if (typeof path === 'string') {
        if (typeof opts.separator === 'string') {
            // remove leading and trailing separators
            let processedPath = path.slice(
                path.startsWith(opts.separator) ? 1 : 0,
                path.endsWith(opts.separator) ? -1 : undefined
            );
            result = processedPath.split(opts.separator);
        } else {
            result = [path];
        }
    } else if (!Array.isArray(path)) {
        // cast to array with single item - single key
        result = [`${path}`];
    } else {
        result = path;
    }
    if (Array.isArray(result) && opts.depth !== undefined && Object.hasOwn(opts, 'depth')) {
        result = result.slice(0, opts.depth);
    }
    return result;
}

/**
 * Recursively clones value
 *
 * @param value - the value to recursively clone
 * @returns the deep cloned value
 */
export function cloneDeep<T>(value: T): T {
    return lodashCloneDeep(value);
}

/**
 * Gets the value at path of object. If the resolved value is undefined, the options.default is returned in its place
 *
 * @param obj - the object to query
 * @param path - the path of the property to get
 * @param options - default value or options
 * @returns the resolved value
 */
export function get<T = unknown>(
    obj: object,
    path: PathType,
    options?: PathOptions | T
): T | undefined {
    const hasOptions = !!(options && typeof options === 'object' && !Array.isArray(options));
    return lodashObjectGet(
        obj,
        parsePath(path, hasOptions ? (options as PathOptions) : {}),
        hasOptions ? (options as PathOptions)?.default : options
    ) as T | undefined;
}

/**
 * Checks if path is a direct property of object
 *
 * @param obj - the object to query
 * @param path - the path of the property to get
 * @param options - options
 * @returns true if path exists, else false.
 */
export function has(obj: object, path: PathType, options?: PathOptions): boolean {
    return lodashObjectHas(obj, parsePath(path, options));
}

/**
 * Sets the value at path of object. If a portion of path doesn't exist, it's created.
 *
 * @param obj - the object to modify
 * @param path - the path of the property to set
 * @param value - the value to set
 * @param options - options
 * @returns returns object
 */
export function set<T extends object>(
    obj: T,
    path: PathType,
    value: unknown,
    options?: PathOptions
): T {
    return lodashObjectSet(obj, parsePath(path, options), value);
}

/**
 * Removes the property at path of object.
 *
 * @param obj - the object to query
 * @param path - the path of the property to unset
 * @param options - options
 * @returns true if the property is deleted, else false
 */
export function unset(obj: object, path: PathType, options?: PathOptions): boolean {
    return lodashObjectUnset(obj, parsePath(path, options));
}

/**
 * Generate unique property name if needed
 *
 * @param key - key to check, it may not exist in the object
 * @param data - data
 * @param options - options
 * @returns unique key
 */
export function uniqueProperty(
    key: string,
    data: object,
    options?: UniquePropertyOptions
): string {
    let resultKey = key;
    if (has(data, [key])) {
        const sep = options?.separator ?? '_';
        // use 1 as base, easier to read declaration
        for (let i = 1; ; i += 1) {
            const compKey = `${key}${sep}${i}`;
            // key should not exist in the object or
            // the origin key was generated that is acceptable
            if (!has(data, [compKey])) {
                resultKey = compKey;
                break;
            }
        }
    }
    return resultKey;
}

const objectUtils = {
    cloneDeep,
    get,
    has,
    set,
    uniqueProperty,
    unset
};

export default objectUtils;
module.exports = objectUtils;
