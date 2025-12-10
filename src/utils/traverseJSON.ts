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

/* eslint-disable @typescript-eslint/no-explicit-any */

export type TraverseJSONCallback = (
    parent: any,
    key: string | number,
    depth?: number,
    stop?: () => void,
    path?: (string | number)[]
) => boolean | string | void;

export interface TraverseJSONOptions {
    breakCircularRef?: any;
    maxDepth?: number;
    sortObjKeys?: boolean | ((a: string, b: string) => number);
}

type ParentCtx = [any, string | number | null, number?];

/**
 * 'key' callback for traverseJSONKey
 */
function traverseJSONCb(
    parentCtx: ParentCtx,
    key: string | number,
    waiting: ParentCtx[],
    cb?: (parent: any, key: string | number) => boolean | string | void
): boolean {
    const parentItem = parentCtx[0];
    if (cb) {
        const retVal = cb(parentItem, key);
        // asked to ignore current key and its nested data
        if (retVal === false) {
            return false;
        }
        // asked to use a new key due old one was renamed
        if (typeof retVal === 'string') {
            key = retVal;
        }
    }
    const currentItem = parentItem[key];

    if (typeof currentItem === 'object' && currentItem !== null) {
        // to keep the order of item in waiting list need to push next elem in array first
        if (Array.isArray(parentItem) && (key as number + 1) < parentItem.length) {
            waiting.push([parentItem, parentCtx[1], (key as number) + 1]);
        }
        waiting.push([currentItem, key]);
        return true;
    }
    return false;
}

/**
 * Traverse object and its nested data (non-recursive)
 *
 * @param data - data to traverse
 * @param cb - callback
 * @param options - options
 */
function traverseJSON(
    data: any,
    cb?: TraverseJSONCallback | TraverseJSONOptions,
    options?: TraverseJSONOptions | TraverseJSONCallback
): void {
    // support objects/arrays for now, but should not be a problem to extend
    // to support other types
    if (arguments.length < 2
        || typeof data !== 'object'
        || data === null
        || (Array.isArray(data) && data.length === 0)
    ) {
        return;
    }

    let actualCb: TraverseJSONCallback | undefined;
    let actualOptions: TraverseJSONOptions | undefined;

    // Handle flexible argument order
    if (typeof cb === 'function') {
        actualCb = cb;
        actualOptions = options as TraverseJSONOptions | undefined;
    } else {
        actualOptions = cb as TraverseJSONOptions | undefined;
        actualCb = options as TraverseJSONCallback | undefined;
    }

    actualOptions = actualOptions ?? {};
    const breakCircularRef = actualOptions.breakCircularRef === undefined ? false : actualOptions.breakCircularRef;
    const maxDepth = actualOptions.maxDepth === undefined ? 0 : actualOptions.maxDepth;
    const needObjKeysSorting = !!actualOptions.sortObjKeys;
    // undefined is OK for default sorting if no compareFn passed to the func
    const objKeysCompareFn = typeof actualOptions.sortObjKeys === 'function' ? actualOptions.sortObjKeys : undefined;

    if (!(actualCb || breakCircularRef !== false)) {
        return;
    }

    // - array of arrays - [currentLvl, obj1, obj2...]
    // - like a stack
    // - have to store currentLvl because it's value may 'jump', e.g. from 0 to 3
    const buckets: [number, ...any[]][] = [];

    // - fast search 0(1) - recursion detection
    // - according to docs it keeps keys in order of insertion
    // - stores object's key in parent item
    const bucketsMap = new Map<any, string | number | null>();

    // [[item, key-or-index-in-parent-object, next-index-in-array]]
    const waiting: ParentCtx[] = [[data, null]];

    // current item from 'waiting' list - [item, key-or-index-in-parent-object, next-index-in-array]
    let currentCtx: ParentCtx;
    let currentLvl: number;
    let stopNotRequested = true;

    /**
     * Add current item to stack if allowed
     */
    const addToStack = (): boolean => {
        if (maxDepth && bucketsMap.size >= maxDepth) {
            return false;
        }
        // create new bucket or push current item to recent one
        let len = buckets.length;
        if (!len || buckets[len - 1]![0] !== currentLvl) {
            buckets.push([currentLvl]);
            len += 1;
        }
        buckets[len - 1]!.push(currentCtx[0]);
        bucketsMap.set(currentCtx[0], currentCtx[1]);
        return true;
    };

    // trying to have less unnecessary calculations/data
    let innerCb: ((parent: any, itemKey: string | number) => boolean | string | void) | undefined;
    if (actualCb) {
        if (actualCb.length < 3) {
            innerCb = (parent, itemKey) => actualCb!(parent, itemKey);
        } else if (actualCb.length < 4) {
            innerCb = (parent, itemKey) => actualCb!(parent, itemKey, bucketsMap.size);
        } else {
            /**
             * Stop function execution
             */
            const stopCb = (): void => {
                stopNotRequested = false;
            };
            if (actualCb.length < 5) {
                innerCb = (parent, itemKey) => actualCb!(parent, itemKey, bucketsMap.size, stopCb);
            } else {
                /**
                 * Compute current path
                 */
                const getCurrentPath = (): (string | number)[] => {
                    const it = bucketsMap.values();
                    const p: (string | number)[] = [];
                    // skip first element - it is root object, it doesn't have a parent
                    it.next();
                    let result = it.next();
                    while (!result.done) {
                        if (result.value !== null) {
                            p.push(result.value);
                        }
                        result = it.next();
                    }
                    return p;
                };
                innerCb = (parent, itemKey) => actualCb!(parent, itemKey, bucketsMap.size, stopCb, getCurrentPath());
            }
        }
    }

    /**
     * @param key - item's key
     * @returns true when item added to waiting list
     */
    const keyCb = (key: string | number): boolean => traverseJSONCb(currentCtx, key, waiting, innerCb);

    while (waiting.length && stopNotRequested) {
        // [item, parent-key-or-index]
        // if it has 3rd element, then 'item' in stack already
        currentCtx = waiting.pop()!;
        currentLvl = waiting.length;

        // remove buckets from other levels if needed
        for (let i = buckets.length - 1; i >= 0; i -= 1) {
            if (buckets[i]![0] > currentLvl) {
                const toRemove = buckets.pop()!;
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
                    const bucket = buckets[buckets.length - 1]!;
                    bucket[bucket.length - 1]![currentCtx[1] as string | number] = breakCircularRef;
                }
                // skip item, it was inspected already
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
                for (let i = (currentCtx.length > 2 ? currentCtx[2]! : 0);
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
                keyCb(objKeys[i]!);
            }
        }
    }
}

export default traverseJSON;
module.exports = traverseJSON;
