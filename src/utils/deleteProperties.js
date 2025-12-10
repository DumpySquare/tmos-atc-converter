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

const objectUtil = require('./object');

const ITEM_DELETED = Symbol('ITEM_DELETED');
const ITEM_NOT_FOUND = Symbol('ITEM_NOT_FOUND');

/**
 * Item Context Class
 *
 * Note:
 * - 'item' and 'parent' properties are cached value and doesn't follow modifications in 'root'.
 *  To get up to date value call ctx.copy() to get new instance of ItemCtx
 *
 * @property {boolean} isRoot - true if 'item' is 'root' object
 * @property {any} item - item located at 'itemPath' or ITEM_DELETED symbol if not found
 * @property {string} itemKey - item's key in 'parent' object
 * @property {Array<string>} itemPath - path to the item
 * @property {any} parent - item's parent object or ITEM_DELETED symbol if not found
 * @property {Array<string>} parentPath - path to the item's parent object
 * @property {any} root - root object
 */
class ItemCtx {
    /**
     * Constructor
     *
     * @param {any} root - root object
     * @param {Array<string>} path - path to item, e.g. ['a', 'b', 'c']
     */
    constructor(root, path) {
        Object.defineProperties(this, {
            itemPath: {
                value: path
            },
            root: {
                value: root
            }
        });
    }

    /**
     * @returns {boolean} true if 'item' is 'root' object
     */
    get isRoot() {
        return this.item === this.root;
    }

    /**
     * @returns {any} item located at 'itemPath' or ITEM_NOT_FOUND symbol if not found
     */
    get item() {
        Object.defineProperty(this, 'item', {
            value: getValue(this.root, this.itemPath)
        });
        return this.item;
    }

    /**
     * @returns {string} item's key in 'parent' object
     */
    get itemKey() {
        Object.defineProperty(this, 'itemKey', {
            value: this.itemPath.at(-1)
        });
        return this.itemKey;
    }

    /**
     * @returns {any} item's parent object or ITEM_NOT_FOUND symbol if not found
     */
    get parent() {
        Object.defineProperty(this, 'parent', {
            value: getValue(this.root, this.parentPath)
        });
        return this.parent;
    }

    /**
     * @returns {Array<string>} path to the item's parent object
     */
    get parentPath() {
        Object.defineProperty(this, 'parentPath', {
            value: this.itemPath.slice(0, -1)
        });
        return this.parentPath;
    }

    /**
     * Create copy of ItemCtx
     *
     * @returns {ItemCtx} copy
     */
    copy() {
        return new ItemCtx(this.root, this.itemPath);
    }

    /**
     * Create parent's ItemCtx instance
     *
     * @returns {ItemCtx} parent's ItemCtx
     */
    parentCtx() {
        return new ItemCtx(this.root, this.parentPath);
    }
}

/**
 * Delete item from object by key
 *
 * Note:
 * - function assumes that 'key' exists in 'obj'
 * - for arrays istead of deleting item it will be replaced with 'ITEM_DELETED' symbol
 *    that should be removed late at final stage
 *
 * @param {ItemCtx} ctx - object
 */
function deleteItem(ctx) {
    if (Array.isArray(ctx.parent)) {
        ctx.parent[ctx.itemKey] = ITEM_DELETED;
    } else {
        delete ctx.parent[ctx.itemKey];
    }
}

/**
 * Get value by path
 *
 * Note:
 * - function returns 'root' when 'path' is empty
 * - function is treating 'path' as is, no additional normalization
 *
 * @param {any} root - root object
 * @param {Array<string>} path - path to object
 *
 * @returns {any} value or ITEM_DELETED symbol if not found
 */
function getValue(root, path) {
    if (!path.length) {
        return root;
    }
    return objectUtil.get(root, path, ITEM_NOT_FOUND);
}

/**
 * Check if 'path' is valid
 *
 * Note:
 * - path should start with '/'
 * - path should not end with '/'
 * - path should not point to 'root' object ('/')
 *
 * @param {string} path - path
 *
 * @returns {boolean} true if path is valid
 */
function isPathValid(path) {
    return path.startsWith('/') && path !== '/' && !path.endsWith('/');
}

/**
 * Check if 'item' exists
 *
 * @param {ItemCtx} ctx - item context
 *
 * @returns {boolean} true if 'item' exists
 */
function itemExists(ctx) {
    return ctx.item !== ITEM_NOT_FOUND && ctx.item !== ITEM_DELETED;
}

/**
 * Convert 'path' to string
 *
 * @param {Array<string>} path
 *
 * @returns {string} path as a string
 */
function stringifyPath(path) {
    return `/${path.join('/')}`;
}

/**
 * Parse 'path'
 *
 * @param {string} path - path
 *
 * @returns {Array<string>} parsed path
 */
function parsePath(path) {
    return path.split('/').slice(1);
}

/**
 * Function find and delete object/property by path
 *
 * Note:
 * - mutates 'obj'
 * - if as result of manipulation array is empty -> it will be removed
 * - if as result of manipulation object is empty -> it will be removed
 *
 * @param {any} obj - source json object
 * @param {Array<string>} paths - paths to object to delete (e.g. /a/b/c)
 *
 * @returns {{deleted: Array<string>, ignored: Array<string>}} list of removed paths
 */
module.exports = (obj, paths) => {
    // list of arrays for post processing
    const postProcessObjects = { maxDepth: 0 };
    const deletedPaths = new Set();
    const ignoredPaths = new Set();

    /**
     * Add array to priority stack
     *
     * @param {ImteCtx} ctx - item context
     */
    function addItemCtxToStack(ctx) {
        const depth = ctx.itemPath.length;
        if (depth > postProcessObjects.maxDepth) {
            postProcessObjects.maxDepth = depth;
        }
        if (!objectUtil.has(postProcessObjects, [depth])) {
            postProcessObjects[depth] = new Map();
        }
        postProcessObjects[depth].set(ctx.item, ctx);
    }

    /**
     * Clean up parent objects (up to root)
     * - empty objects and arrays will all elements removed will be removed immediately
     * - arrays with mix of data and empty slots left for post process
     *
     * @param {ItemCtx} ctx - item context
     */
    function cleanupParentObjects(ctx) {
        while (!ctx.isRoot) {
            ctx = ctx.parentCtx();

            let canBeRemoved = false;
            if (Array.isArray(ctx.item)) {
                // array allowed to be marked for removal when has all elements removed only
                canBeRemoved = ctx.item.every((el) => el === ITEM_DELETED);
                if (!canBeRemoved) {
                    /**
                     * should revisit the item (array) later:
                     * - it has mix of empty slots and data
                     * - can't remove empty slots because it will shift data
                     *   and may make it inaccessible in case other 'path' point to it
                     */
                    addItemCtxToStack(ctx);
                }
            } else {
                // empty objects can be safely marked for removal
                canBeRemoved = Object.keys(ctx.item).length === 0;
            }
            if (!canBeRemoved) {
                break;
            }
            deleteItemAndCollectPath(ctx);
        }
    }

    /**
     * Remove item and collect its path
     *
     * @param {ItemCtx} ctx - item context
     */
    function deleteItemAndCollectPath(ctx) {
        if (!ctx.isRoot) {
            deleteItem(ctx);
            deletedPaths.add(stringifyPath(ctx.itemPath));
        }
    }

    /**
     * Remove ITEM_DELETED symbol from array
     *
     * @param {Array} array - array
     */
    function removeDeletedItemsFromArray(array) {
        let i = 0;
        while (i < array.length) {
            if (array[i] === ITEM_DELETED) {
                array.splice(i, 1);
            } else {
                i += 1;
            }
        }
    }

    /**
     * Revisit all postponded objects. It starts from bottom and goes all the way up.
     *
     * @param {Function} cb - callback
     */
    function revisitObjects(cb) {
        for (let depth = postProcessObjects.maxDepth; depth >= 0; depth -= 1) {
            if (objectUtil.has(postProcessObjects, [depth])) {
                postProcessObjects[depth].forEach(cb);
            }
        }
    }

    // to have less false-positive 'ignored' paths need to sort paths by depth first
    paths = paths.filter((path) => {
        if (isPathValid(path)) {
            return true;
        }
        ignoredPaths.add(path);
        return false;
    })
        .map((path) => parsePath(path));

    paths.sort((a, b) => b.length - a.length); // sort by path length, asc order
    paths.forEach((path) => {
        const ctx = new ItemCtx(obj, path);
        if (itemExists(ctx)) {
            deleteItemAndCollectPath(ctx);
            cleanupParentObjects(ctx);
        } else {
            path = stringifyPath(path);
            if (!deletedPaths.has(path)) {
                ignoredPaths.add(path);
            }
        }
    });

    // time to revisit all postponded arrays to clean up ITEM_DELETED,
    // (arrays with some of the elements deleted and some not)
    revisitObjects((ctx) => {
        ctx = ctx.copy(); // reset cached properties
        if (itemExists(ctx)) {
            removeDeletedItemsFromArray(ctx.item);
        }
    });

    return {
        deleted: [...deletedPaths],
        ignored: [...ignoredPaths]
    };
};
