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
import traverseJSON from './traverseJSON';

export type RenamePropertiesCallback = (
    parent: any,
    key: string,
    value: any
) => string;

interface RenameHistoryData {
    [key: string]: [string | false, RenameHistoryData?];
}

/**
 * Store history for renamed paths
 */
class RenameHistory {
    private _data: RenameHistoryData = {};

    /**
     * Add record for old and new keys
     *
     * @param oldKey - old key
     * @param newKey - new key
     * @param path - path to parent object
     */
    add(oldKey: string, newKey: string, path: (string | number)[]): void {
        let cur: RenameHistoryData = this._data;
        path.forEach((pathPart) => {
            const key = String(pathPart);
            if (!Object.hasOwn(cur, key)) {
                cur[key] = [false, {}];
            } else if ((cur[key] as [string | false, RenameHistoryData?]).length === 1) {
                (cur[key] as [string | false, RenameHistoryData]).push({});
            }
            cur = (cur[key] as [string | false, RenameHistoryData])[1]!;
        });
        cur[newKey] = [oldKey];
    }

    /**
     * Get origin path
     *
     * @param currentPath - current path
     * @returns origin path
     */
    getOriginPath(currentPath: (string | number)[]): (string | number)[] {
        const originPath: (string | number)[] = [];
        let cur: RenameHistoryData = this._data;

        for (let i = 0; i < currentPath.length; i += 1) {
            const pathPart = String(currentPath[i]);
            const entry = cur[pathPart] as [string | false, RenameHistoryData?];
            const originKey = entry[0];
            originPath.push(originKey === false ? pathPart : originKey);
            cur = entry[1]!;
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
 * @param data - data
 * @param cb - callback
 * @returns old-new keys pairs (e.g. [[['old', 'absolute-path'], ['new', 'absolute-path']]])
 */
function renameProperties(
    data: any,
    cb: RenamePropertiesCallback
): [(string | number)[], (string | number)[]][] {
    const history = new RenameHistory();
    const renamed: [(string | number)[], (string | number)[]][] = [];

    traverseJSON(data, (parent, currentKey, _depth, _stopCb, path) => {
        const key = String(currentKey);
        const newKey = cb(parent, key, parent[key]);
        if (newKey !== key) {
            parent[newKey] = parent[key];
            delete parent[key];

            history.add(key, newKey, path ?? []);
            const newPath = (path ?? []).concat(newKey);
            renamed.push([history.getOriginPath(newPath), newPath]);

            return newKey;
        }
        return undefined;
    }, {
        sortObjKeys: true // more deterministic results
    });

    return renamed;
}

export default renameProperties;
module.exports = renameProperties;
