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
import objectUtil from './object';

const ITEM_DELETED = Symbol('ITEM_DELETED');
const ITEM_NOT_FOUND = Symbol('ITEM_NOT_FOUND');

export interface DeleteResult {
    deleted: string[];
    ignored: string[];
}

/**
 * Item Context Class
 *
 * Note:
 * - 'item' and 'parent' properties are cached value and doesn't follow modifications in 'root'.
 *  To get up to date value call ctx.copy() to get new instance of ItemCtx
 */
class ItemCtx {
    readonly itemPath: string[];
    readonly root: any;
    private _item?: any;
    private _itemKey?: string;
    private _parent?: any;
    private _parentPath?: string[];

    /**
     * Constructor
     *
     * @param root - root object
     * @param path - path to item, e.g. ['a', 'b', 'c']
     */
    constructor(root: any, path: string[]) {
        this.itemPath = path;
        this.root = root;
    }

    /**
     * @returns true if 'item' is 'root' object
     */
    get isRoot(): boolean {
        return this.item === this.root;
    }

    /**
     * @returns item located at 'itemPath' or ITEM_NOT_FOUND symbol if not found
     */
    get item(): any {
        if (this._item === undefined) {
            this._item = getValue(this.root, this.itemPath);
        }
        return this._item;
    }

    /**
     * @returns item's key in 'parent' object
     */
    get itemKey(): string {
        if (this._itemKey === undefined) {
            this._itemKey = this.itemPath.at(-1)!;
        }
        return this._itemKey;
    }

    /**
     * @returns item's parent object or ITEM_NOT_FOUND symbol if not found
     */
    get parent(): any {
        if (this._parent === undefined) {
            this._parent = getValue(this.root, this.parentPath);
        }
        return this._parent;
    }

    /**
     * @returns path to the item's parent object
     */
    get parentPath(): string[] {
        if (this._parentPath === undefined) {
            this._parentPath = this.itemPath.slice(0, -1);
        }
        return this._parentPath;
    }

    /**
     * Create copy of ItemCtx
     *
     * @returns copy
     */
    copy(): ItemCtx {
        return new ItemCtx(this.root, this.itemPath);
    }

    /**
     * Create parent's ItemCtx instance
     *
     * @returns parent's ItemCtx
     */
    parentCtx(): ItemCtx {
        return new ItemCtx(this.root, this.parentPath);
    }
}

/**
 * Delete item from object by key
 *
 * Note:
 * - function assumes that 'key' exists in 'obj'
 * - for arrays instead of deleting item it will be replaced with 'ITEM_DELETED' symbol
 *    that should be removed late at final stage
 *
 * @param ctx - object
 */
function deleteItem(ctx: ItemCtx): void {
    if (Array.isArray(ctx.parent)) {
        ctx.parent[ctx.itemKey as any] = ITEM_DELETED;
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
 * @param root - root object
 * @param path - path to object
 * @returns value or ITEM_DELETED symbol if not found
 */
function getValue(root: any, path: string[]): any {
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
 * @param path - path
 * @returns true if path is valid
 */
function isPathValid(path: string): boolean {
    return path.startsWith('/') && path !== '/' && !path.endsWith('/');
}

/**
 * Check if 'item' exists
 *
 * @param ctx - item context
 * @returns true if 'item' exists
 */
function itemExists(ctx: ItemCtx): boolean {
    return ctx.item !== ITEM_NOT_FOUND && ctx.item !== ITEM_DELETED;
}

/**
 * Convert 'path' to string
 *
 * @param path
 * @returns path as a string
 */
function stringifyPath(path: string[]): string {
    return `/${path.join('/')}`;
}

/**
 * Parse 'path'
 *
 * @param path - path
 * @returns parsed path
 */
function parsePath(path: string): string[] {
    return path.split('/').slice(1);
}

interface PostProcessObjects {
    maxDepth: number;
    [key: number]: Map<any, ItemCtx>;
}

/**
 * Function find and delete object/property by path
 *
 * Note:
 * - mutates 'obj'
 * - if as result of manipulation array is empty -> it will be removed
 * - if as result of manipulation object is empty -> it will be removed
 *
 * @param obj - source json object
 * @param paths - paths to object to delete (e.g. /a/b/c)
 * @returns list of removed paths
 */
function deleteProperties(obj: any, paths: string[]): DeleteResult {
    // list of arrays for post processing
    const postProcessObjects: PostProcessObjects = { maxDepth: 0 };
    const deletedPaths = new Set<string>();
    const ignoredPaths = new Set<string>();

    /**
     * Add array to priority stack
     *
     * @param ctx - item context
     */
    function addItemCtxToStack(ctx: ItemCtx): void {
        const depth = ctx.itemPath.length;
        if (depth > postProcessObjects.maxDepth) {
            postProcessObjects.maxDepth = depth;
        }
        if (!objectUtil.has(postProcessObjects, [depth])) {
            postProcessObjects[depth] = new Map();
        }
        postProcessObjects[depth]!.set(ctx.item, ctx);
    }

    /**
     * Remove item and collect its path
     *
     * @param ctx - item context
     */
    function deleteItemAndCollectPath(ctx: ItemCtx): void {
        if (!ctx.isRoot) {
            deleteItem(ctx);
            deletedPaths.add(stringifyPath(ctx.itemPath));
        }
    }

    /**
     * Clean up parent objects (up to root)
     * - empty objects and arrays will all elements removed will be removed immediately
     * - arrays with mix of data and empty slots left for post process
     *
     * @param ctx - item context
     */
    function cleanupParentObjects(ctx: ItemCtx): void {
        let currentCtx = ctx;
        while (!currentCtx.isRoot) {
            currentCtx = currentCtx.parentCtx();

            let canBeRemoved = false;
            if (Array.isArray(currentCtx.item)) {
                // array allowed to be marked for removal when has all elements removed only
                canBeRemoved = currentCtx.item.every((el: any) => el === ITEM_DELETED);
                if (!canBeRemoved) {
                    /**
                     * should revisit the item (array) later:
                     * - it has mix of empty slots and data
                     * - can't remove empty slots because it will shift data
                     *   and may make it inaccessible in case other 'path' point to it
                     */
                    addItemCtxToStack(currentCtx);
                }
            } else {
                // empty objects can be safely marked for removal
                canBeRemoved = Object.keys(currentCtx.item).length === 0;
            }
            if (!canBeRemoved) {
                break;
            }
            deleteItemAndCollectPath(currentCtx);
        }
    }

    /**
     * Remove ITEM_DELETED symbol from array
     *
     * @param array - array
     */
    function removeDeletedItemsFromArray(array: any[]): void {
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
     * Revisit all postponed objects. It starts from bottom and goes all the way up.
     *
     * @param cb - callback
     */
    function revisitObjects(cb: (ctx: ItemCtx) => void): void {
        for (let depth = postProcessObjects.maxDepth; depth >= 0; depth -= 1) {
            if (objectUtil.has(postProcessObjects, [depth])) {
                postProcessObjects[depth]!.forEach(cb);
            }
        }
    }

    // to have less false-positive 'ignored' paths need to sort paths by depth first
    let processedPaths = paths.filter((path) => {
        if (isPathValid(path)) {
            return true;
        }
        ignoredPaths.add(path);
        return false;
    })
        .map((path) => parsePath(path));

    processedPaths.sort((a, b) => b.length - a.length); // sort by path length, asc order
    processedPaths.forEach((path) => {
        const ctx = new ItemCtx(obj, path);
        if (itemExists(ctx)) {
            deleteItemAndCollectPath(ctx);
            cleanupParentObjects(ctx);
        } else {
            const pathStr = stringifyPath(path);
            if (!deletedPaths.has(pathStr)) {
                ignoredPaths.add(pathStr);
            }
        }
    });

    // time to revisit all postponed arrays to clean up ITEM_DELETED,
    // (arrays with some of the elements deleted and some not)
    revisitObjects((ctx) => {
        const freshCtx = ctx.copy(); // reset cached properties
        if (itemExists(freshCtx)) {
            removeDeletedItemsFromArray(freshCtx.item);
        }
    });

    return {
        deleted: [...deletedPaths],
        ignored: [...ignoredPaths]
    };
}

export default deleteProperties;
module.exports = deleteProperties;
