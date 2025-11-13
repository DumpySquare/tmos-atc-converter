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

const traverseJSON = require('../traverseJSON');

/**
 * Store history for renamed paths
 */
class RenameHistory {
    constructor() {
        /**
         * Non-optimized structure to keep the code more simple:
         * _data = {
         *      "level1": [
         *          false, // <--- indicates that "level1" is origin name and never renamed
         *          {
         *              "level2": [
         *                  "oldNameForLevel2", // <--- old name used before renaming to "level2"
         *                  {
         *                      "level3": []
         *                  }
         *              ]
         *          }
         *      ]
         * }
         */
        this._data = {};
    }

    /**
     * Add record for old and new keys
     *
     * @param {string} oldKey - old key
     * @param {string} newKey - new key
     * @param {Array<string>} path - path to parent object
     */
    add(oldKey, newKey, path) {
        let cur = this._data;
        path.forEach((pathPart) => {
            if (!Object.hasOwn(cur, pathPart)) {
                cur[pathPart] = [false, {}];
            } else if (cur[pathPart].length === 1) {
                cur[pathPart].push({});
            }
            cur = cur[pathPart][1];
        });
        cur[newKey] = [oldKey];
    }

    /**
     * Get origin path
     *
     * @param {Array<string>} currentPath - current path
     *
     * @returns {Array<string>} origin path
     */
    getOriginPath(currentPath) {
        const originPath = [];
        let cur = this._data;

        for (let i = 0; i < currentPath.length; i += 1) {
            const pathPart = currentPath[i];
            const originKey = cur[pathPart][0];
            originPath.push(originKey === false ? pathPart : originKey);
            cur = cur[pathPart][1];
        }
        return originPath;
    }
}

/**
 * Rename properties
 *
 * Note:
 * - mutates 'data'
 *
 * @sync
 * @public
 *
 * @param {any} data - data
 * @param {RenamePropertiesCallback} cb - callback
 *
 * @returns {Array<Array<Array<string>>>} old-new keys pairs
 *  (e.g. [[['old', 'absolute-path'], ['new', 'absolute-path']]])
 */
module.exports = function renameProperties(data, cb) {
    const history = new RenameHistory();
    const renamed = [];

    // eslint-disable-next-line consistent-return
    traverseJSON(data, (parent, currentKey, depth, stopCb, path) => {
        const newKey = cb(parent, currentKey, parent[currentKey]);
        if (newKey !== currentKey) {
            parent[newKey] = parent[currentKey];
            delete parent[currentKey];

            history.add(currentKey, newKey, path);
            const newPath = path.concat(newKey);
            renamed.push([history.getOriginPath(newPath), newPath]);

            return newKey;
        }
    }, {
        sortObjKeys: true // more determenistic results
    });

    return renamed;
};

/**
 * @callback RenamePropertiesCallback
 * @param {any} parent - parent object
 * @param {string} key - current key
 * @param {any} value - value
 * @returns {string} origin or renamed key
 */
