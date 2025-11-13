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

const lodashIsEmpty = require('lodash/isEmpty');
const lodashGet = require('lodash/get');
const lodashUpdate = require('lodash/update');
const lodashSet = require('lodash/set');
const lodashUnset = require('lodash/unset');
const lodashConcat = require('lodash/concat');
const lodashCloneDeep = require('lodash/cloneDeep');
const lodashIsArray = require('lodash/isArray');
const lodashHas = require('lodash/has');
const lodashSome = require('lodash/some');
const lodashArray = require('lodash/isArray');
const lodashObject = require('lodash/isObject');
const lodashEntries = require('lodash/entries');

class GlobalRenameAndSkippedObject {
    #obj;

    #config;

    constructor() {
        this.#obj = {};
        this.#config = {};
    }

    getGlobalObj() {
        return this.#obj;
    }

    setConfig(config) {
        this.#config = config;
    }

    /**
     * Get the path array without '/' and '[]'
     *
     * @param {string | Array} path
     * e.g. /tenant/application_1/obj[0], /tenant/application_2/smth
     *
     * @param deleteOperation - if the function is called from deleteProperty
     *
     * @returns {Array} resolved path
     * e.g. ['tenant', 'application_1', 'obj', '0'], ['tenant', 'application_2', 'smth']
     */
    #getResolvedPath(path, deleteOperation = false) {
        if (Array.isArray(path) && path[0] === '') {
            path.shift();
            return path;
        }
        let pathArr = path.split('/');
        pathArr.shift();
        const currentPath = [];
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
            if (lodashHas(this.#obj, [...currentPath, arrPath, 'internalArray']) && deleteOperation) {
                const pathWithArray = [arrPath, 'internalArray'];
                currentPath.push(...pathWithArray);
                return pathWithArray;
            }
            currentPath.push(arrPath);
            return arrPath;
        });
        return pathArr;
    }

    /**
     * Get tmshInfo with tmshHeader and tmshPath for the property (primitive or not)
     *
     * @param {string | Array} parentPath
     * @param {string} propertyName
     *
     * @param {boolean} bypassPropCheck
     * @returns {Object | undefined} tmshInfo
     */
    getTmshInfo(parentPath, propertyName, bypassPropCheck = false) {
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
     * @param {string} parentPath
     * @param {string} propertyName
     * @param {string} tmshHeader
     * @param {string} tmshPath
     */
    setTmshInfo(parentPath, propertyName, tmshHeader, tmshPath) {
        let pathArr;
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
     * @param {string} oldParentPath
     * @param {string} oldPropertyName
     * @param {string} newParentPath
     * @param {string} newPropertyName
     * @param {boolean} isArray
     */
    moveAll(oldParentPath, oldPropertyName, newParentPath, newPropertyName, isArray = false) {
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
     * @param {string} oldParentPath
     * @param {string} oldPropertyName
     * @param {string} newParentPath
     * @param {string} newPropertyName
     * @param {boolean} isArray
     */
    checkAndMoveAllToArray(oldParentPath, oldPropertyName, newParentPath, newPropertyName, isArray = false) {
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
     * @param {string} parentPath
     * @param {string} propertyName
     * @param {string | object} tmshHeader
     * @param {string} tmshPath
     * @param {boolean} isArray
     */
    addProperty(parentPath, propertyName, tmshHeader, tmshPath, objArray = null, movableObject = null) {
        if (parentPath !== '/') {
            const pathArr = this.#getResolvedPath(parentPath);
            let newTmshPath = '';
            if (propertyName) {
                pathArr.push(propertyName);
            }
            if (!(parentPath)) {
                parentPath = propertyName;
            }
            if (objArray) {
                const internalArrayObj = [];
                // eslint-disable-next-line no-restricted-syntax
                for (const obj of objArray) {
                    if (obj[0] === '/') {
                        newTmshPath = `${tmshPath}${obj}`;
                    } else {
                        newTmshPath = `${tmshPath}/${obj}`;
                    }
                    internalArrayObj.push({ tmshHeader, tmshPath: newTmshPath });
                }
                if (!(lodashGet(this.#obj, pathArr)) && (lodashIsEmpty(this.getTmshInfo(parentPath, propertyName)))) {
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
            if (parentPath === '' || lodashIsEmpty(this.getTmshInfo(parentPath, propertyName))) {
                lodashSet(this.#obj, pathArr, {
                    tmshHeader,
                    tmshPath
                });
            }
        }
    }
    /**
     *  Search tmsshpath variable in json conf and log only if it is there
     * @param {object} tmshPath
     *  @param {object} jsonDetails
     */

    searchInJsonConfUsingTmshPath(tmshPath, jsonDetails) {
        let keyExists = false;
        const search = (tmshProp, jsonDetailsObj) => {
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
        };

        search(tmshPath, jsonDetails);
        return keyExists;
    }

    /**
     * search the key in json and return true if found
     *  @param {object} obj
     *  @param {string} keyToFind
     */

    keyExistsInJson(jsonObj, searchString) {
        let found = false;

        const search = (obj) => {
            if (found) return true; // Exit early if already found

            if (lodashArray(obj)) {
                found = lodashSome(obj, (item) => {
                    if (lodashObject(item) && item !== null) {
                        return search(item); // Recursively search within the nested object
                    }
                    return item === searchString;
                });
            } else if (lodashObject(obj) && obj !== null) {
                found = lodashSome(obj, (value, key) => {
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
     * @param {string} parentPath
     * @param {string} propertyName
     * @param {string} customReason
     * @param {boolean} onlyLog
     * @param {object} jsonObj
     * @param {string} internalReason
     */

    deleteProperty(parentPath, propertyName, customReason = 'This property is not supported', onlyLog = false, jsonObj = null, fixText = 'Contact F5 Support', internalReason = customReason) {
        let tmshHeader;
        let tmshPath;
        let tmshInfo;
        let pathArr;
        let propExistsInJson = true;
        if (propertyName.includes('[') && propertyName.includes(']')) {
            parentPath += `/${propertyName}`;
            pathArr = this.#getResolvedPath(parentPath);
            pathArr = pathArr.filter((path) => path);
            tmshInfo = lodashGet(this.#obj, pathArr);
            tmshHeader = tmshInfo?.tmshHeader;
            tmshPath = tmshInfo?.tmshPath;
            const index = pathArr.pop();
            const property = pathArr.pop();
            const arr = this.getTmshInfo(`/${pathArr.join('/')}`, property);
            if (!onlyLog) {
                arr.splice(index, 1);
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

            this.#config.requestContext.logRemoveProperty({
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
     * @param {string} oldParentPath
     * @param {string} oldPropertyName
     * @param {string} newParentPath
     * @param {string} newPropertyName
     * @param {string} modifiedPathName
     */
    moveProperty(oldParentPath, oldPropertyName, newParentPath, newPropertyName, modifiedPathName = false) {
        const oldObj = this.getTmshInfo(oldParentPath, oldPropertyName);
        const customReason = 'RenamedProperty';
        if (!lodashIsEmpty(oldObj)) {
            if ('internalArray' in oldObj) {
                this.addProperty(newParentPath, newPropertyName, oldObj, null, null, oldObj);
            } else {
                this.addProperty(newParentPath, newPropertyName, oldObj.tmshHeader, oldObj.tmshPath);
            }
            if (!modifiedPathName) {
                this.deleteProperty(oldParentPath, oldPropertyName, customReason);
            }
        }
    }

    /**
     * Resets the global object for tests
     */
    reset() {
        Object.keys(this.#obj).forEach((key) => {
            delete this.#obj[key];
        });
        Object.keys(this.#config).forEach((key) => {
            delete this.#config[key];
        });
    }

    /**
     * Wrapper function to get tmshHeader and tmshPath for a property
     *
     * @param {string} objPath
     * @param {string} prop
     * @param {boolean} bypassPropCheck
     * @returns {Object} tmshInfo containing tmshHeader and tmshPath
     */
    getTmshInfoWrapper(objPath, prop, bypassPropCheck = false) {
        let tmshHeader = 'unknown tmsh header';
        let tmshPath = { unknownTmshPath: null };
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

let singletonGlobalObj = null;
singletonGlobalObj = Object.freeze(new GlobalRenameAndSkippedObject());

module.exports = singletonGlobalObj;
