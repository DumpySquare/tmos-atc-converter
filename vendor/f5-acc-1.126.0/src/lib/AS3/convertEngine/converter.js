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

/* eslint-disable max-classes-per-file, no-restricted-syntax */

'use strict';

const lodashIsEmpty = require('lodash/isEmpty');
const constants = require('../../../constants');
const customDict = require('../customDict');
const getMergedAS3Properties = require('../as3Properties');
const objectUtil = require('../../../util/object');
const traverseJSON = require('../../../util/traverseJSON');
const globalObjectUtil = require('../../../util/globalRenameAndSkippedObject');
const hyphensToCamel = require('../../../util/convert/hyphensToCamel');
const parseNestedString = require('../../../util/convert/parseNestedString');
/** Use to indicate when no value set */
const NO_VALUE = Symbol('NO_VALUE');
let objectPropertyPath = Symbol('NO_VALUE');
let objectTmshHeader = Symbol('NO_VALUE');

/**
 * Object Context Class for ConvertEngine
 *
 * @property {object} convertedData - converted data
 */
class ObjectContext {
    /** @type {object} */
    #configHandler;

    /** @type {ConvertEngine} */
    #engine;

    /** @type {string} */
    #tmosConfigKey;

    /** @type {object} */
    #tmosConfigObject;

    /**
     * Constructor
     *
     * @param {ConvertEngine} engine - ConvertEngine instance
     * @param {string} tmosConfigKey - TMOS Config Object key
     * @param {object} tmosConfigObject - TMOS Config Object
     */
    constructor(engine, tmosConfigKey, tmosConfigObject) {
        this.#configHandler = objectUtil.get(customDict, tmosConfigKey, null);
        this.#engine = engine;
        this.#tmosConfigKey = tmosConfigKey;
        this.#tmosConfigObject = objectUtil.cloneDeep(tmosConfigObject);
        this.convertedData = {};
    }

    /** @returns {object} */
    get configHandler() {
        return this.#configHandler;
    }

    /** @returns {Array<object>} array of properties definitions */
    get definitions() {
        return objectUtil.cloneDeep(
            objectUtil.get(this.#engine.propertiesMap, this.#tmosConfigKey, [])
        );
    }

    /** @returns {ConvertEngine} instance */
    get engine() {
        return this.#engine;
    }

    /** @returns {string} TMOS Config key */
    get tmosConfigKey() {
        return this.#tmosConfigKey;
    }

    /** @returns {object} deep clone of origin TMOS Config Object */
    get tmosConfigObject() {
        return objectUtil.cloneDeep(this.#tmosConfigObject);
    }

    /** @returns {boolean} true if `tmosConfigKey` is supported and data can be */
    isSupported() {
        return !!this.definitions.length;
    }
}

/**
 * Property Context Class for ConvertEngine
 *
 * @property {string} convertedPropertyKey - converted property key
 * @property {any} convertedPropertyValue - converted propert value
 */
class PropertyContext {
    /** @type {ObjectContext} */
    #objectCtx;

    /** @type {object} */
    #propertyDefinition;

    /** @type {boolean} */
    #stopFlag = false;

    /** @type {string} */
    #tmosPropertyKey;

    /** @type {any} */
    #tmosPropertyValue;

    /**
     * Constructor
     *
     * @param {ObjectContext} objectCtx
     * @param {string} tmosPropertyKey
     * @param {any} tmosPropertyValue
     * @param {object} definition
     */
    constructor(objectCtx, tmosPropertyKey, tmosPropertyValue, definition) {
        this.#objectCtx = objectCtx;
        this.#propertyDefinition = objectUtil.cloneDeep(definition);
        this.#tmosPropertyKey = tmosPropertyKey;
        this.#tmosPropertyValue = objectUtil.cloneDeep(tmosPropertyValue);
        this.convertedPropertyKey = NO_VALUE;
        this.convertedPropertyValue = NO_VALUE;
    }

    /** @returns {object} */
    get configHandler() {
        return this.#objectCtx.configHandler;
    }

    /** @returns {object} */
    get convertedData() {
        return this.#objectCtx.convertedData;
    }

    /** @returns {ConvertEngine} instance */
    get engine() {
        return this.#objectCtx.engine;
    }

    /** @returns {object} property definition */
    get propertyDefinition() {
        return objectUtil.cloneDeep(this.#propertyDefinition);
    }

    /** @returns {string} TMOS Config key */
    get tmosConfigKey() {
        return this.#objectCtx.tmosConfigKey;
    }

    /** @returns {object} deep clone of origin TMOS Config Object */
    get tmosConfigObject() {
        return this.#objectCtx.tmosConfigObject;
    }

    /** @returns {string} TMOS Property key */
    get tmosPropertyKey() {
        return this.#tmosPropertyKey;
    }

    /** @returns {any} TMOS Property value */
    get tmosPropertyValue() {
        return objectUtil.cloneDeep(this.#tmosPropertyValue);
    }

    /**
     * @returns {boolean} true if processing for the context enabled
     */
    isActive() {
        return !this.#stopFlag;
    }

    /**
     * Get action's value
     *
     * @param {string} actionName - action name
     *
     * @returns {any} action's value
     */
    getActionValue(actionName) {
        return this.#propertyDefinition[actionName];
    }

    /**
     * Check if action defined in `propertyDefinition`
     *
     * @param {string} actionName
     *
     * @returns {boolean}
     */
    hasAction(actionName) {
        return objectUtil.has(this.#propertyDefinition, actionName);
    }

    /**
     * Stop processing for the context
     */
    stop() {
        this.#stopFlag = true;
    }
}

/**
 * Property-based Convert Engine Class
 */
class ConvertEngine {
    /** @type {Array} */
    #defaultActions;

    /** @type {Array} */
    #publicActions;

    /** @type {object} */
    #propertiesMap;

    /**
     * Constructor
     *
     * @param {object} actions - actions
     * @param {Array} actions.default - default actions
     * @param {Array} actions.public - public actions
     */
    constructor(actions) {
        this.#defaultActions = objectUtil.get(actions, 'default', []);
        this.#publicActions = objectUtil.get(actions, 'public', []);
        this.#propertiesMap = getMergedAS3Properties();
    }

    /**
     * Properties map
     *
     * @returns {object}
     */
    get propertiesMap() {
        return this.#propertiesMap;
    }

    /**
     * Log TMSH properties that are not recognized by AS3 Core (cannot be found in properties.json)
     *
     * If a sub-object cannot be found in properties.json only the name of the sub-object will be logged:
     * E.g., if properties.josn has:
     * "ltm pool": [
     *   { "id": "members",                   "extend": "objArray", "default": null },
     *   { "id": "metadata",                  "extend": "objArray" }
     * ],
     * "ltm pool metadata": [
     *   { "id": "name" },
     *   { "id": "value" },
     *   { "id": "persist" }
     * ...
     * And BIG-IP configuration has a misspelled sub-object name:
     * ltm pool my_pool {
     *   Mmetadata: {
     *     mdata1: {
     *       name: 'mdata1',
     *       value: 'value1',
     *       persist: 0
     *     }
     * ...
     * Then only "Mmetadata" will be logged as skipped (and not "mdata1" and its properties).
     *
     * @param {ObjectContext} objectCtx
     * @param {string} tmosConfigKey - TMOS Config Object key
     * @param {object} tmosConfigObject - TMOS Config Object
     * @param {object} options.accConfig - configuration of ACC call
     * @param {string} options.tmshHeader - tmsh class and object name, e.g., "ltm profile tcp some_profile"
     * @param {boolean} retryFlag - Set to True if the convertion of a property failed and retrying again.
     * @param {string} options.originalTmshHeader - original name of tmsh class (before duplicates).
     */
    #logSkippedProperties(objectCtx, tmosConfigKey, tmosConfigObject, options, retryFlag = false) {
        if (
            options && options.accConfig && options.accConfig.jsonLogs
            && options.tmshHeader && options.originalTmshHeader) {
            const as3Props = objectCtx.definitions.map((prop) => prop.id);
            for (const tmosProp of Object.keys(tmosConfigObject)) {
                if (!constants.JSON_LOGS.PROPERTIES_NOT_TO_LOG.includes(tmosProp)
                && !as3Props.includes(tmosProp)
                && !retryFlag) {
                    options.accConfig.requestContext.logSkipTmshProperty({
                        reason: `'${tmosProp}' of '${tmosConfigKey}' is not an AS3 Core recognized property`,
                        tmshHeader: options.originalTmshHeader,
                        tmshPath: { [tmosProp]: null },
                        fix_text: 'Contact F5 Support'
                    });
                }
            }
        }
    }

    /**
     * originValue just copies TMSH sub-object as is.
     * So, the for the shadow object we need to preserve the structure,
     * and add tmshHeader and tmosPath
     *
     * @param {PropertyContext} - propertyCtx
     * @param {string} tmshHeader - tmsh class and object name, e.g., "ltm profile tcp some_profile"
     * @returns {object} property value with TMSH info
     */
    #addTmshInfoForOriginValue(propertyCtx, tmshHeader) {
        // add to each node tmsh header and path
        const propWithTmshInfo = objectUtil.cloneDeep(propertyCtx.convertedPropertyValue);
        traverseJSON(propWithTmshInfo, (parent, key, depth, stop, pathInternal) => {
            /* update only the original properties
                do not get into an infinite loop with tmsh properties */
            if (key !== 'tmshHeader' && key !== 'tmshPath'
                && !pathInternal.includes('tmshHeader')
                && !pathInternal.includes('tmshPath')
            ) {
                // reconstruct the path to the property within tmsh object
                const pathArray = [...pathInternal];
                pathArray.unshift(propertyCtx.tmosPropertyKey);
                pathArray.push(key);
                let bigObj = null;
                while (pathArray.length > 0) {
                    bigObj = { [pathArray.pop()]: bigObj };
                }

                /* shadow object does not care about primitive values
                    but we need to convert it to an object in order to store tmshHeader and tmosPath */
                if (typeof parent[key] !== 'object') {
                    parent[key] = {};
                }
                parent[key].tmshHeader = tmshHeader;
                parent[key].tmshPath = bigObj;
            }
        });
        return propWithTmshInfo;
    }

    /**
     * Convert TMOS Config object
     *
     * @param {string} tmosConfigKey - TMOS Config Object key
     * @param {object} tmosConfigObject - TMOS Config Object
     * @param {object} options.accConfig - configuration of ACC call
     * @param {string} options.tmshHeader - tmsh class and object name, e.g., "ltm profile tcp some_profile"
     * @param {string} options.originalTmshHeader - original name of tmsh class (before duplicates),
     *
     * @returns {object} converted object
     */
    async convert(tmosConfigKey, tmosConfigObject, options, tmshPath = null, retryFlag = false) {
        const objectCtx = new ObjectContext(this, tmosConfigKey, tmosConfigObject);
        if (objectCtx.isSupported()) {
            this.#logSkippedProperties(objectCtx, tmosConfigKey, tmosConfigObject, options, retryFlag);
            await this.#runWithCtx(objectCtx, options, tmshPath);
        }
        return objectCtx.convertedData;
    }

    /**
     * @param {ObjectContext} objectCtx
     * @param {object} options.accConfig - configuration of ACC call
     * @param {string} options.tmshHeader - tmsh class and object name, e.g., "ltm profile tcp some_profile"
     * @param {string} options.originalTmshHeader - original name of tmsh class (before duplicates),
     */
    async #runWithCtx(objectCtx, options, tmshPathObj = null) {
        // handling empty path for global object
        let path;
        let existingPath;
        let headerValue;
        let tmshPathNestedValue = null;
        let tmshpathValue = null;
        if (options && options.accConfig && options.tmshHeader && options.originalTmshHeader) {
            // Match either quoted strings or non-space characters and remove quotes
            path = options.tmshHeader.match(/"([^"]+)"|(\S+)/g).pop().replace(/"/g, '');
            const splittedPath = path.split('/');
            if (splittedPath.length === 1) {
                splittedPath.unshift('');
                globalObjectUtil.addProperty('', path, '', { [path]: null });
                path = `/${path}`;
            } else {
                existingPath = splittedPath.slice(0, -1);
                const tmshPathArr = [...existingPath];
                const existingProperty = existingPath.pop();
                let tmshPath = '';
                if (lodashIsEmpty(globalObjectUtil.getTmshInfo(existingPath, existingProperty))) {
                    tmshPathArr.forEach((currentPath, index) => {
                        if (index + 1 in tmshPathArr) {
                            const subPath = tmshPathArr.slice(0, index + 1).join('/');
                            tmshPath += `/${tmshPathArr[index + 1]}`;
                            globalObjectUtil.addProperty(
                                subPath,
                                tmshPathArr[index + 1],
                                '',
                                { [tmshPath]: null }
                            );
                        }
                    });
                }
            }
            const firstSplittedPath = [...splittedPath];
            firstSplittedPath.pop();
            headerValue = options.originalTmshHeader;
            globalObjectUtil.addProperty(
                firstSplittedPath.join('/'),
                splittedPath.pop(),
                headerValue,
                { [splittedPath.join('/')]: null }
            );
        } else {
            path = objectPropertyPath;
            if (objectPropertyPath !== NO_VALUE && objectTmshHeader !== NO_VALUE) {
                path = objectPropertyPath;
                headerValue = objectTmshHeader;
            }
        }
        for (const def of objectCtx.definitions) {
            const tmosObject = objectCtx.tmosConfigObject;
            if (!(objectUtil.has(def, 'id') && objectUtil.has(tmosObject, [def.id]))) {
                // eslint-disable-next-line no-continue
                continue;
            }

            const propertyCtx = new PropertyContext(
                objectCtx,
                def.id,
                tmosObject[def.id],
                def
            );
            for (const action of this.#publicActions) {
                if (!propertyCtx.isActive()) {
                    if (path && propertyCtx.hasAction('altId')) {
                        globalObjectUtil.addProperty(
                            path,
                            propertyCtx.getActionValue(action.name),
                            headerValue,
                            { [propertyCtx.tmosPropertyKey]: null } // propertyCtx.tmospropertykey
                        );
                    }
                    break;
                }

                if (propertyCtx.hasAction(action.name)) {
                    // eslint-disable-next-line no-await-in-loop
                    if (
                        action.name === 'extend'
                        && propertyCtx.getActionValue(action.name) === 'object'
                    ) {
                        objectPropertyPath = path;
                        objectTmshHeader = headerValue;
                        if (tmshPathObj) {
                            tmshPathObj = `${tmshPathObj}/${propertyCtx.tmosPropertyKey}`;
                        } else {
                            tmshPathObj = propertyCtx.tmosPropertyKey;
                        }
                    }
                    // eslint-disable-next-line no-await-in-loop
                    await action.action(propertyCtx, propertyCtx.getActionValue(action.name), tmshPathObj);
                    if (options) {
                        tmshPathObj = null;
                    }
                    // eslint-disable-next-line no-await-in-loop
                    if (action.name === 'altId' && path) {
                        if (tmshPathObj) {
                            tmshPathNestedValue = `${tmshPathObj}/${propertyCtx.tmosPropertyKey}`;
                            tmshpathValue = parseNestedString(tmshPathNestedValue);
                        } else {
                            tmshpathValue = { [propertyCtx.tmosPropertyKey]: null };
                        }
                        globalObjectUtil.addProperty(
                            path,
                            propertyCtx.getActionValue(action.name),
                            headerValue,
                            tmshpathValue // propertyCtx.tmospropertykey
                        );
                        if (options && options.accConfig && options.accConfig.jsonLogs) {
                            options.accConfig.requestContext.logRenameProperty({
                                tmshHeader: headerValue,
                                tmshPath: tmshpathValue,
                                property: propertyCtx.convertedPropertyKey,
                                reason: 'reverse translation of an AS3 Core property to comply with the schema'
                            });
                        }
                    }
                }
            }
            if (!propertyCtx.hasAction('altId') && path) {
                // add non-renamed objects
                if (tmshPathObj) {
                    tmshPathNestedValue = `${tmshPathObj}/${propertyCtx.tmosPropertyKey}`;
                    tmshpathValue = parseNestedString(tmshPathNestedValue);
                } else {
                    tmshpathValue = { [propertyCtx.tmosPropertyKey]: null };
                }
                globalObjectUtil.addProperty(
                    path,
                    propertyCtx.tmosPropertyKey,
                    headerValue,
                    tmshpathValue
                );
            }
            for (const action of this.#defaultActions) {
                if (!propertyCtx.isActive()) {
                    if (!propertyCtx.hasAction('altId')
                        && !(propertyCtx.tmosPropertyKey
                            === hyphensToCamel(propertyCtx.tmosPropertyKey)
                        ) && path) {
                        globalObjectUtil.moveProperty(
                            path,
                            propertyCtx.tmosPropertyKey,
                            path,
                            hyphensToCamel(propertyCtx.tmosPropertyKey)
                        );
                    }
                    break;
                }
                const oldConvertedPropertyKey = propertyCtx.convertedPropertyKey === NO_VALUE
                    ? propertyCtx.tmosPropertyKey : propertyCtx.convertedPropertyKey;
                // eslint-disable-next-line no-await-in-loop
                await action.action(propertyCtx, options, path);
                if (action.name === 'originValue') {
                    const propName = propertyCtx.convertedPropertyKey === NO_VALUE
                        ? propertyCtx.tmosPropertyKey : propertyCtx.convertedPropertyKey;
                    if (typeof propertyCtx.convertedPropertyValue !== 'object'
                            || propertyCtx.convertedPropertyValue === null
                    ) {
                        // primitive property
                        if (tmshPathObj) {
                            tmshPathNestedValue = `${tmshPathObj}/${propertyCtx.tmosPropertyKey}`;
                            tmshpathValue = parseNestedString(tmshPathNestedValue);
                        } else {
                            tmshpathValue = { [propertyCtx.tmosPropertyKey]: null };
                        }
                        globalObjectUtil.addProperty(
                            path,
                            propName,
                            headerValue,
                            tmshpathValue
                        );
                    } else {
                        // object
                        // eslint-disable-next-line no-lonely-if
                        if (tmshPathObj) {
                            tmshPathNestedValue = `${tmshPathObj}/${propertyCtx.tmosPropertyKey}`;
                            tmshpathValue = parseNestedString(tmshPathNestedValue);
                        } else {
                            tmshpathValue = { [propertyCtx.tmosPropertyKey]: null };
                        }
                        globalObjectUtil.addProperty(
                            path,
                            propName,
                            headerValue,
                            tmshpathValue,
                            null,
                            this.#addTmshInfoForOriginValue(propertyCtx, headerValue)
                        );
                    }
                } else if (action.name === 'defaultAltId' && !propertyCtx.hasAction('altId') && !(propertyCtx.tmosPropertyKey === hyphensToCamel(propertyCtx.tmosPropertyKey)) && path) {
                    globalObjectUtil.moveProperty(
                        path,
                        propertyCtx.tmosPropertyKey,
                        path,
                        hyphensToCamel(propertyCtx.tmosPropertyKey)
                    );
                    if (options && options.accConfig && options.accConfig.jsonLogs) {
                        options.accConfig.requestContext.logRenameProperty({
                            tmshHeader: headerValue,
                            tmshPath: { [propertyCtx.tmosPropertyKey]: null },
                            property: propertyCtx.convertedPropertyKey,
                            reason: 'reverse translation of an AS3 Core property to comply with the schema'
                        });
                    }
                } else if (action.name === 'defaultAltId'
                        && oldConvertedPropertyKey !== propertyCtx.convertedPropertyKey
                ) {
                    // key might change in defaultAltId but not the value
                    const propName = propertyCtx.convertedPropertyKey === NO_VALUE
                        ? propertyCtx.tmosPropertyKey : propertyCtx.convertedPropertyKey;
                    globalObjectUtil.moveAll(
                        path,
                        propName,
                        path,
                        propertyCtx.convertedPropertyKey
                    );
                    if (options && options.accConfig && options.accConfig.jsonLogs) {
                        options.accConfig.requestContext.logRenameProperty({
                            tmshHeader: headerValue,
                            tmshPath: { [propertyCtx.tmosPropertyKey]: null },
                            property: propertyCtx.convertedPropertyKey,
                            reason: 'reverse translation of an AS3 Core property to comply with the schema'
                        });
                    }
                }
            }
        }
    }
}

module.exports = ConvertEngine;
module.exports.NO_VALUE = NO_VALUE;
