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
import lodashIsEmpty from 'lodash/isEmpty';
import lodashGet from 'lodash/get';
import lodashUpdate from 'lodash/update';
import lodashSet from 'lodash/set';
import lodashUnset from 'lodash/unset';
import lodashConcat from 'lodash/concat';
import lodashCloneDeep from 'lodash/cloneDeep';
import lodashIsArray from 'lodash/isArray';
import lodashHas from 'lodash/has';
import lodashSome from 'lodash/some';
import lodashArray from 'lodash/isArray';
import lodashObject from 'lodash/isObject';
import lodashEntries from 'lodash/entries';

export interface TmshInfo {
    tmshHeader?: string;
    tmshPath?: any;
    internalArray?: TmshInfo[];
}

export interface GlobalConfig {
    jsonLogs?: boolean;
    requestContext?: {
        logRemoveProperty: (info: {
            path: string;
            reason: string;
            fix_text: string;
            internal_reason: string;
            tmshHeader?: string;
            tmshPath?: any;
        }) => void;
    };
}

class GlobalRenameAndSkippedObject {
    #obj: Record<string, any>;
    #config: GlobalConfig;

    constructor() {
        this.#obj = {};
        this.#config = {};
    }

    getGlobalObj(): Record<string, any> {
        return this.#obj;
    }

    setConfig(config: GlobalConfig): void {
        this.#config = config;
    }

    /**
     * Get the path array without '/' and '[]'
     *
     * @param path - e.g. /tenant/application_1/obj[0], /tenant/application_2/smth
     * @param deleteOperation - if the function is called from deleteProperty
     * @returns resolved path e.g. ['tenant', 'application_1', 'obj', '0'], ['tenant', 'application_2', 'smth']
     */
    #getResolvedPath(path: string | string[], deleteOperation = false): string[] {
        if (Array.isArray(path) && path[0] === '') {
            path.shift();
            return path;
        }
        let pathArr = (path as string).split('/');
        pathArr.shift();
        const currentPath: string[][] = [];
        pathArr = pathArr.flatMap((arrPath) => {
            if (arrPath.includes('[') && arrPath.includes(']')) {
                const bracelessStr = arrPath.replace('[', '/').replace(']', '/');
                const splitArr = bracelessStr.split('/');
                splitArr.pop();
                if (!(splitArr.includes('internalArray'))) {
                    splitArr.splice(1, 0, 'internalArray');
                }
                currentPath.push(splitArr);
                return splitArr;
            }
            // as3NextCleanup sending the path without square brackets
            // e.g. /members/0/hostname
            // so we need to add "internalArray" word manually
            const flatPath = currentPath.flat();
            if (lodashHas(this.#obj, [...flatPath, arrPath, 'internalArray']) && deleteOperation) {
                const pathWithArray = [arrPath, 'internalArray'];
                currentPath.push(pathWithArray);
                return pathWithArray;
            }
            currentPath.push([arrPath]);
            return arrPath;
        });
        return pathArr;
    }

    /**
     * Get tmshInfo with tmshHeader and tmshPath for the property (primitive or not)
     *
     * @param parentPath
     * @param propertyName
     * @param bypassPropCheck
     * @returns tmshInfo
     */
    getTmshInfo(parentPath: string | string[], propertyName: string, bypassPropCheck = false): TmshInfo | undefined {
        if (bypassPropCheck) {
            // Temporary workaround to allow getting tmsh info of props that contain slashes in their name e.g.
            // /Common/http, which will be the case of nested properties like profiles in Virtual Servers , etc.
            const pathArr = this.#getResolvedPath(parentPath);
            pathArr.push(propertyName);
            return lodashGet(this.#obj, pathArr);
        }
        if (!propertyName.includes('/')) {
            if (parentPath === '') {
                return lodashGet(this.#obj, propertyName);
            }
            let pathArr = this.#getResolvedPath(parentPath);
            if (propertyName.includes('[') && propertyName.includes(']')) {
                const bracelessStr = propertyName.replace('[', '/')
                    .replace(']', '/');
                const splitArr = bracelessStr.split('/');
                splitArr.pop();
                if (!(splitArr.includes('internalArray'))) {
                    splitArr.splice(1, 0, 'internalArray');
                }
                pathArr = lodashConcat(pathArr, splitArr);
            } else {
                pathArr.push(propertyName);
            }
            if (pathArr[pathArr.length - 1] === '') {
                // TODO: fix it for real
                pathArr.pop();
            }
            return lodashGet(this.#obj, pathArr);
        }
        return undefined;
    }

    /**
     * Set tmshHeader and tmshPath for an existing property (primitive or not)
     *
     * @param parentPath
     * @param propertyName
     * @param tmshHeader
     * @param tmshPath
     */
    setTmshInfo(parentPath: string, propertyName: string, tmshHeader: string, tmshPath: any): void {
        let pathArr: string[];
        if (parentPath !== '/') {
            if (propertyName.includes('[') && propertyName.includes(']')) {
                parentPath += `/${propertyName}`;
                pathArr = this.#getResolvedPath(parentPath);
            } else {
                pathArr = this.#getResolvedPath(parentPath);
                pathArr.push(propertyName);
            }
            pathArr.push('tmshHeader');
            lodashUpdate(this.#obj, pathArr, () => tmshHeader);
            pathArr.pop();
            pathArr.push('tmshPath');
            lodashUpdate(this.#obj, pathArr, () => tmshPath);
        }
    }

    /**
     * Moves existing object, including the nested props
     *
     * @param oldParentPath
     * @param oldPropertyName
     * @param newParentPath
     * @param newPropertyName
     * @param isArray
     */
    moveAll(oldParentPath: string, oldPropertyName: string, newParentPath: string, newPropertyName: string, isArray = false): void {
        const oldObj = this.getTmshInfo(oldParentPath, oldPropertyName);
        const pathArr = this.#getResolvedPath(newParentPath);
        const oldPathArr = this.#getResolvedPath(oldParentPath);
        pathArr.push(newPropertyName);
        oldPathArr.push(oldPropertyName);
        if (!lodashIsEmpty(oldObj)) {
            if (!isArray) {
                lodashSet(this.#obj, pathArr, oldObj);
                lodashUnset(this.#obj, oldPathArr);
            } else {
                const currentArray = lodashGet(this.#obj, pathArr, []);
                lodashSet(this.#obj, pathArr, [...currentArray, lodashCloneDeep(oldObj)]);
                lodashUnset(this.#obj, oldPathArr);
            }
        }
    }

    /**
     * Checks if the array exists, if not it creates it,
     * If array is not empty it gets reset before moving.
     * Used to avoid duplicates entries in shadow object,
     * especially when dealing with customMaps
     *
     * @param oldParentPath
     * @param oldPropertyName
     * @param newParentPath
     * @param newPropertyName
     * @param isArray
     */
    checkAndMoveAllToArray(oldParentPath: string, oldPropertyName: string, newParentPath: string, newPropertyName: string, isArray = false): void {
        const newFullPath = this.#getResolvedPath(newParentPath).concat(newPropertyName);
        const currentArray = lodashGet(this.#obj, newFullPath, []);

        if (!isArray || (lodashIsArray(currentArray) && !lodashIsEmpty(currentArray))) {
            lodashSet(this.#obj, newFullPath, []);
            this.moveAll(oldParentPath, oldPropertyName, newParentPath, newPropertyName, isArray);
        } else if (lodashIsArray(currentArray) && lodashIsEmpty(currentArray)) {
            this.moveAll(oldParentPath, oldPropertyName, newParentPath, newPropertyName, isArray);
        }
    }

    /**
     * Adds a new object, array, primitive property, empty object or empty array
     *
     * @param parentPath
     * @param propertyName
     * @param tmshHeader
     * @param tmshPath
     * @param objArray
     * @param movableObject
     */
    addProperty(parentPath: string, propertyName: string | null, tmshHeader: string | TmshInfo, tmshPath: any, objArray: string[] | null = null, movableObject: any = null): void {
        if (parentPath !== '/') {
            const pathArr = this.#getResolvedPath(parentPath);
            let newTmshPath = '';
            if (propertyName) {
                pathArr.push(propertyName);
            }
            let workingParentPath = parentPath;
            if (!parentPath) {
                workingParentPath = propertyName ?? '';
            }
            if (objArray) {
                const internalArrayObj: TmshInfo[] = [];
                for (const obj of objArray) {
                    if (obj[0] === '/') {
                        newTmshPath = `${tmshPath}${obj}`;
                    } else {
                        newTmshPath = `${tmshPath}/${obj}`;
                    }
                    internalArrayObj.push({ tmshHeader: tmshHeader as string, tmshPath: newTmshPath });
                }
                if (!(lodashGet(this.#obj, pathArr)) && (lodashIsEmpty(this.getTmshInfo(workingParentPath, propertyName ?? '')))) {
                    lodashSet(this.#obj, pathArr, {
                        tmshHeader,
                        tmshPath
                    });
                    pathArr.push('internalArray');

                    lodashSet(this.#obj, pathArr, internalArrayObj);
                } else {
                    const currentObj = lodashGet(this.#obj, pathArr, propertyName);
                    lodashSet(this.#obj, pathArr, lodashConcat(currentObj, internalArrayObj));
                }
            }
            if (movableObject) {
                lodashSet(this.#obj, pathArr, movableObject);
                // add tmshHeader and tmshHeader to the top level of the added object
                pathArr.push('tmshHeader');
                lodashSet(this.#obj, pathArr, tmshHeader);
                pathArr.pop();
                pathArr.push('tmshPath');
                lodashSet(this.#obj, pathArr, tmshPath);
                pathArr.pop();
            }
            if (workingParentPath === '' || lodashIsEmpty(this.getTmshInfo(workingParentPath, propertyName ?? ''))) {
                lodashSet(this.#obj, pathArr, {
                    tmshHeader,
                    tmshPath
                });
            }
        }
    }

    /**
     *  Search tmshpath variable in json conf and log only if it is there
     * @param tmshPath
     * @param jsonDetails
     */
    searchInJsonConfUsingTmshPath(tmshPath: any, jsonDetails: any): boolean {
        let keyExists = false;
        const search = (tmshProp: any, jsonDetailsObj: any): boolean => {
            lodashSome(lodashEntries(tmshProp), ([key, val]) => {
                if (lodashObject(val) && val !== null) {
                    if (search(val, jsonDetailsObj)) {
                        keyExists = true;
                    }
                } else {
                    keyExists = this.keyExistsInJson(jsonDetailsObj, key);

                    if ((key === 'bigip' && keyExists === false) || (key === 'class' && keyExists === false)) {
                        keyExists = true;
                    }
                }
                return keyExists;
            });
            return keyExists;
        };

        search(tmshPath, jsonDetails);
        return keyExists;
    }

    /**
     * search the key in json and return true if found
     * @param jsonObj
     * @param searchString
     */
    keyExistsInJson(jsonObj: any, searchString: string): boolean {
        let found = false;

        const search = (obj: any): boolean => {
            if (found) return true; // Exit early if already found

            if (lodashArray(obj)) {
                found = lodashSome(obj, (item: any) => {
                    if (lodashObject(item) && item !== null) {
                        return search(item); // Recursively search within the nested object
                    }
                    return item === searchString;
                });
            } else if (lodashObject(obj) && obj !== null) {
                found = lodashSome(obj, (value: any, key: string) => {
                    if (key === searchString || value === searchString) {
                        return true; // Exit as soon as the searchString is found
                    }
                    if (lodashObject(value) && value !== null) {
                        return search(value); // Recursively search within the nested object
                    }
                    return false;
                });
            }

            return found;
        };

        search(jsonObj);
        return found;
    }

    /**
     * Deletes an object (empty or not), array, or primitive property
     *
     * @param parentPath
     * @param propertyName
     * @param customReason
     * @param onlyLog
     * @param jsonObj
     * @param fixText
     * @param internalReason
     */
    deleteProperty(
        parentPath: string,
        propertyName: string,
        customReason = 'This property is not supported',
        onlyLog = false,
        jsonObj: any = null,
        fixText = 'Contact F5 Support',
        internalReason: string = customReason
    ): void {
        let tmshHeader: string | undefined;
        let tmshPath: any;
        let tmshInfo: TmshInfo | undefined;
        let pathArr: string[];
        let propExistsInJson = true;
        let workingParentPath = parentPath;

        if (propertyName.includes('[') && propertyName.includes(']')) {
            workingParentPath += `/${propertyName}`;
            pathArr = this.#getResolvedPath(workingParentPath);
            pathArr = pathArr.filter((path) => path);
            tmshInfo = lodashGet(this.#obj, pathArr);
            tmshHeader = tmshInfo?.tmshHeader;
            tmshPath = tmshInfo?.tmshPath;
            const index = pathArr.pop()!;
            const property = pathArr.pop()!;
            const arr = this.getTmshInfo(`/${pathArr.join('/')}`, property) as any[];
            if (!onlyLog) {
                arr.splice(Number(index), 1);
                lodashSet(this.#obj, [...pathArr, property], arr);
            }
        } else {
            pathArr = this.#getResolvedPath(parentPath, true);
            pathArr.push(propertyName);
            tmshInfo = lodashGet(this.#obj, pathArr);
            tmshHeader = tmshInfo?.tmshHeader;
            tmshPath = tmshInfo?.tmshPath;
            if (!onlyLog) {
                lodashUnset(this.#obj, pathArr);
            }
        }
        if (jsonObj && tmshPath) {
            propExistsInJson = this.searchInJsonConfUsingTmshPath(tmshPath, jsonObj);
        }
        if (this.#config.jsonLogs && (customReason !== 'RenamedProperty' && customReason !== 'nestedObjectsReassingment') && propExistsInJson) {
            if (tmshHeader) {
                if (tmshHeader.includes('dup')) {
                    const dupObjectNameIndex = tmshHeader.lastIndexOf('/');
                    let tmshAddressPath = tmshHeader.slice(0, tmshHeader.lastIndexOf('/'));
                    let dupObjectName = tmshHeader.slice(dupObjectNameIndex + 1);
                    dupObjectName = dupObjectName.replace(/^[^_]+_(.*?)_dup$/, '$1');
                    tmshAddressPath = `${tmshAddressPath}/${dupObjectName}`;
                    tmshHeader = tmshAddressPath;
                }
            }

            this.#config.requestContext?.logRemoveProperty({
                path: `${parentPath}/${propertyName}`,
                reason: customReason,
                fix_text: fixText,
                internal_reason: internalReason,
                tmshHeader,
                tmshPath
            });
        }
    }

    /**
     * Moves and renames an object, array or primitive property
     *
     * @param oldParentPath
     * @param oldPropertyName
     * @param newParentPath
     * @param newPropertyName
     * @param modifiedPathName
     */
    moveProperty(oldParentPath: string, oldPropertyName: string, newParentPath: string, newPropertyName: string, modifiedPathName = false): void {
        const oldObj = this.getTmshInfo(oldParentPath, oldPropertyName);
        const customReason = 'RenamedProperty';
        if (!lodashIsEmpty(oldObj)) {
            if (oldObj && 'internalArray' in oldObj) {
                this.addProperty(newParentPath, newPropertyName, oldObj, null, null, oldObj);
            } else if (oldObj) {
                this.addProperty(newParentPath, newPropertyName, oldObj.tmshHeader!, oldObj.tmshPath);
            }
            if (!modifiedPathName) {
                this.deleteProperty(oldParentPath, oldPropertyName, customReason);
            }
        }
    }

    /**
     * Resets the global object for tests
     */
    reset(): void {
        Object.keys(this.#obj).forEach((key) => {
            delete this.#obj[key];
        });
        Object.keys(this.#config).forEach((key) => {
            delete (this.#config as any)[key];
        });
    }

    /**
     * Wrapper function to get tmshHeader and tmshPath for a property
     *
     * @param objPath
     * @param prop
     * @param bypassPropCheck
     * @returns tmshInfo containing tmshHeader and tmshPath
     */
    getTmshInfoWrapper(objPath: string, prop: string, bypassPropCheck = false): { tmshHeader: string; tmshPath: any } {
        let tmshHeader = 'unknown tmsh header';
        let tmshPath: any = { unknownTmshPath: null };
        const source = this.getTmshInfo(objPath, prop, bypassPropCheck);
        if (source && source.tmshHeader) {
            tmshHeader = source.tmshHeader;
        }
        if (source && source.tmshPath) {
            tmshPath = source.tmshPath;
        }
        return { tmshHeader, tmshPath };
    }
}

const singletonGlobalObj = Object.freeze(new GlobalRenameAndSkippedObject());

export default singletonGlobalObj;
module.exports = singletonGlobalObj;
