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

/**
 * 'key' callback for traverseJSONKey
 *
 * @sync
 * @private
 *
 * @param {TraverseJSONCallback | undefined} cb - callback
 * @param {Array} parentInfo - parent info
 * @param {any} key - key to inspect
 * @param {Array} waiting - list of items to inspect
 *
 * @returns {boolean} true when item added to waiting list
 */
function traverseJSONCb(parentCtx, key, waiting, cb) {
    const parentItem = parentCtx[0];
    if (cb) {
        const retVal = cb(parentItem, key);
        // asked to ignore current key and its nested data
        if (retVal === false) {
            return retVal;
        }
        // asked to use a new key due old one was renamed
        if (typeof retVal === 'string') {
            key = retVal;
        }
    }
    const currentItem = parentItem[key];

    if (typeof currentItem === 'object' && currentItem !== null) {
        // to keep the order of item in waiting list need to push next elem in array first
        if (Array.isArray(parentItem) && (key + 1) < parentItem.length) {
            waiting.push([parentItem, parentCtx[1], key + 1]);
        }
        waiting.push([currentItem, key]);
        return true;
    }
    return false;
}

/**
 * Traverse object and its nested data (non-recursive)
 *
 * Note:
 * - mutates 'data' when 'cb' and/or 'breakCircularRef' specified)
 * - doesn't mutates 'options'
 *
 * @sync
 * @public
 *
 * @example
 * traverseJSON(data, cb, options);
 * traverseJSON(data, options, cb);
 * traverseJSON(data, options);
 * traverseJSON(data, cb);
 *
 * @param {any} data - data to traverse
 * @param {TraverseJSONCallback} [cb] - callback
 * @param {object} [options] - options
 * @param {any} [options.breakCircularRef = false] - break circular references by replacing with arg's value
 * @param {number} [options.maxDepth = 0] - max depth
 * @param {boolean | function} [options.sortObjKeys = false] - sort keys, boolean or function (compareFn similar
 *  to Array.prototype.sort). Keys are being sorted for every level not for the entire object
 *
 * @returns {void} once process finished or stopped
 */
function traverseJSON(data, cb, options) {
    // support objects/arrays for now, but should not be a problem to extend
    // to support other types
    if (arguments.length < 2
        || typeof data !== 'object'
        || data === null
        || (Array.isArray(data) && data.length === 0)
    ) {
        return;
    }

    cb = arguments[1];
    options = arguments[2];
    if (typeof cb !== 'function') {
        options = cb;
        cb = arguments[2];
    }

    options = options || {};
    const breakCircularRef = typeof options.breakCircularRef === 'undefined' ? false : options.breakCircularRef;
    const maxDepth = typeof options.maxDepth === 'undefined' ? 0 : options.maxDepth;
    const needObjKeysSorting = !!options.sortObjKeys;
    // undefined is OK for default sorting if no compareFn passed to the func
    const objKeysCompareFn = typeof options.sortKeys === 'function' ? options.sortKeys : undefined;

    if (!(cb || breakCircularRef !== false)) {
        return;
    }

    // - array of arrays - [currentLvl, obj1, obj2...]
    // - like a stack
    // - have to store currentLvl because it's value may 'jump', e.g. from 0 to 3
    const buckets = [];

    // - fast search 0(1) - recursion detection
    // - according to docs it keeps keys in order of insertion
    // - stores object's key in parent item
    const bucketsMap = new Map();

    // [[item, key-or-index-in-parent-object, next-index-in-array]]
    const waiting = [[data, null]];

    // current item from 'waiting' list - [item, key-or-index-in-parent-object, next-index-in-array]
    let currentCtx;
    let currentLvl;
    let stopNotRequested = true;

    /**
     * Add current item to stack if allowed
     *
     * @returns {boolean} true when item added
     */
    const addToStack = () => {
        if (maxDepth && bucketsMap.size >= maxDepth) {
            return false;
        }
        // create new bucket or push current item to recent one
        let len = buckets.length;
        if (!len || buckets[len - 1][0] !== currentLvl) {
            buckets.push([currentLvl]);
            len += 1;
        }
        buckets[len - 1].push(currentCtx[0]);
        bucketsMap.set(currentCtx[0], currentCtx[1]);
        return true;
    };

    // trying to have less unnecessary calculations/data
    let innerCb;
    if (cb) {
        if (cb.length < 3) {
            innerCb = (parent, itemKey) => cb(parent, itemKey);
        } else if (cb.length < 4) {
            innerCb = (parent, itemKey) => cb(parent, itemKey, bucketsMap.size);
        } else {
            /**
             * Stop function execution
             *
             * @returns {void}
             */
            const stopCb = () => {
                stopNotRequested = false;
            };
            if (cb.length < 5) {
                innerCb = (parent, itemKey) => cb(parent, itemKey, bucketsMap.size, stopCb);
            } else {
                /**
                 * Compute current path
                 *
                 * @returns {Array<string | integer>} path
                 */
                const getCurrentPath = () => {
                    const it = bucketsMap.values();
                    const p = [];
                    // skip first element - it is root object, it doesn't have a parent
                    it.next();
                    let result = it.next();
                    while (!result.done) {
                        p.push(result.value);
                        result = it.next();
                    }
                    return p;
                };
                innerCb = (parent, itemKey) => cb(parent, itemKey, bucketsMap.size, stopCb, getCurrentPath());
            }
        }
    }
    /**
     * @param {string | integer} key - item's key
     * @returns {boolean} true when item added to waiting list
     */
    const keyCb = (key) => traverseJSONCb(currentCtx, key, waiting, innerCb);

    /**
     * Example #1:
     *
     * const root = { level1: { level2: { level3: 'value } } };
     *
     * when algo reaches 'level3' then stack will look like following (simplified):
     * [
     *   [0, root-object, level1, level2]
     * ]
     *
     * Waiting list will look like following:
     * [] -> empty, no more items to inspect
     *
     * Note: '0' for each item in stack means that 'level3' is child for 'level2',
     *  'level2' is child for 'level1' and so on.
     *
     * Example #2:
     *
     * const root = {
     *      level1_a: { level2_a: {level3_a: 'value' }},
     *      level1_b: { level2_b: {level3_b: {}, level3_c: 'value' }}
     * };
     *
     * when algo reaches 'level3_c' then stack will look like following (simplified):
     * [
     *   [0, root-object],
     *   [1, level1_b, level2_b]
     * ]
     *
     * Waiting list will look like following:
     * [
     *     level1_a,
     *     level3_b
     * ]
     */

    while (waiting.length && stopNotRequested) {
        // [item, parent-key-or-index]
        // if it has 3rd element, then 'item' in stack already
        currentCtx = waiting.pop();
        currentLvl = waiting.length;

        // remove buckets from other levels if needed
        for (let i = buckets.length - 1; i >= 0; i -= 1) {
            if (buckets[i][0] > currentLvl) {
                const toRemove = buckets.pop();
                for (let j = 1; j < toRemove.length; j += 1) {
                    bucketsMap.delete(toRemove[j]);
                }
            }
        }

        // if it has 3rd element, then 'item' in stack already,
        // no need to check for circular ref
        if (currentCtx.length === 2) {
            const existingCtx = bucketsMap.get(currentCtx[0]);
            if (typeof existingCtx !== 'undefined') {
                // circular ref found
                if (breakCircularRef !== false) {
                    // replace circular-ref in parent object with new value to break a loop
                    const bucket = buckets[buckets.length - 1];
                    bucket[bucket.length - 1][currentCtx[1]] = breakCircularRef;
                }
                // skip item, it was inspected already
                // eslint-disable-next-line no-continue
                continue;
            }
        }

        if (Array.isArray(currentCtx[0])) {
            // if it has 3rd element, then 'item' in stack already
            let allowed = true;
            if (currentCtx.length === 2) {
                allowed = addToStack();
            }
            if (allowed) {
                const itemLen = currentCtx[0].length;
                // start from 0 or continue with next index in queue
                for (let i = (currentCtx.length > 2 ? currentCtx[2] : 0);
                    stopNotRequested && i < itemLen && !keyCb(i);
                    i += 1);
            }
        } else if (addToStack()) {
            const objKeys = Object.keys(currentCtx[0]);
            if (needObjKeysSorting) {
                objKeys.sort(objKeysCompareFn);
            }
            const objLen = objKeys.length;
            for (let i = 0; stopNotRequested && i < objLen; i += 1) {
                keyCb(objKeys[i]);
            }
        }
    }
}

module.exports = traverseJSON;

/**
 * 'traverseJSON' callback
 *
 * Note:
 * - if 'path' is empty Array then parent is 'root' object
 *
 * @callback TraverseJSONCallback
 * @param {any} parent - parent object
 * @param {any} key - key to inspect in parent object
 * @param {integer} depth - current stack depth
 * @param {function} stop - function to call when process should be stopped
 * @param {Array} path - path to parent element
 *
 * @returns {boolean} false when item should be ignored
 */
