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
import constants from '../../../constants';
import customDict from '../dict';
import getMergedAS3Properties from '../properties';
import objectUtil from '../../../utils/object';
import traverseJSON from '../../../utils/traverseJSON';
import globalObjectUtil from '../../../utils/globalRenameAndSkippedObject';
import hyphensToCamel from '../../../utils/hyphensToCamel';
import parseNestedString from '../../../utils/parseNestedString';

/** Use to indicate when no value set */
export const NO_VALUE = Symbol('NO_VALUE');
let objectPropertyPath: symbol | string = NO_VALUE;
let objectTmshHeader: symbol | string = NO_VALUE;

export interface ConvertOptions {
    accConfig?: {
        jsonLogs?: boolean;
        requestContext?: {
            logSkipTmshProperty: (data: any) => void;
            logRenameProperty: (data: any) => void;
        };
    };
    tmshHeader?: string;
    originalTmshHeader?: string;
}

export interface PropertyDefinition {
    id?: string;
    [key: string]: any;
}

export interface Action {
    name: string;
    action: (ctx: any, value: any, options?: any, path?: string) => Promise<void>;
}

/**
 * Object Context Class for ConvertEngine
 */
class ObjectContext {
    #configHandler: any;
    #engine: ConvertEngine;
    #tmosConfigKey: string;
    #tmosConfigObject: Record<string, any>;
    convertedData: Record<string, any>;

    constructor(engine: ConvertEngine, tmosConfigKey: string, tmosConfigObject: Record<string, any>) {
        this.#configHandler = objectUtil.get(customDict, tmosConfigKey, null);
        this.#engine = engine;
        this.#tmosConfigKey = tmosConfigKey;
        this.#tmosConfigObject = objectUtil.cloneDeep(tmosConfigObject);
        this.convertedData = {};
    }

    get configHandler(): any {
        return this.#configHandler;
    }

    get definitions(): PropertyDefinition[] {
        return objectUtil.cloneDeep(
            objectUtil.get(this.#engine.propertiesMap, this.#tmosConfigKey, []) ?? []
        ) as PropertyDefinition[];
    }

    get engine(): ConvertEngine {
        return this.#engine;
    }

    get tmosConfigKey(): string {
        return this.#tmosConfigKey;
    }

    get tmosConfigObject(): Record<string, any> {
        return objectUtil.cloneDeep(this.#tmosConfigObject);
    }

    isSupported(): boolean {
        return !!this.definitions.length;
    }
}

/**
 * Property Context Class for ConvertEngine
 */
class PropertyContext {
    #objectCtx: ObjectContext;
    #propertyDefinition: PropertyDefinition;
    #stopFlag: boolean = false;
    #tmosPropertyKey: string;
    #tmosPropertyValue: any;
    convertedPropertyKey: any;
    convertedPropertyValue: any;

    constructor(objectCtx: ObjectContext, tmosPropertyKey: string, tmosPropertyValue: any, definition: PropertyDefinition) {
        this.#objectCtx = objectCtx;
        this.#propertyDefinition = objectUtil.cloneDeep(definition);
        this.#tmosPropertyKey = tmosPropertyKey;
        this.#tmosPropertyValue = objectUtil.cloneDeep(tmosPropertyValue);
        this.convertedPropertyKey = NO_VALUE;
        this.convertedPropertyValue = NO_VALUE;
    }

    get configHandler(): any {
        return this.#objectCtx.configHandler;
    }

    get convertedData(): Record<string, any> {
        return this.#objectCtx.convertedData;
    }

    get engine(): ConvertEngine {
        return this.#objectCtx.engine;
    }

    get propertyDefinition(): PropertyDefinition {
        return objectUtil.cloneDeep(this.#propertyDefinition);
    }

    get tmosConfigKey(): string {
        return this.#objectCtx.tmosConfigKey;
    }

    get tmosConfigObject(): Record<string, any> {
        return this.#objectCtx.tmosConfigObject;
    }

    get tmosPropertyKey(): string {
        return this.#tmosPropertyKey;
    }

    get tmosPropertyValue(): any {
        return objectUtil.cloneDeep(this.#tmosPropertyValue);
    }

    isActive(): boolean {
        return !this.#stopFlag;
    }

    getActionValue(actionName: string): any {
        return this.#propertyDefinition[actionName];
    }

    hasAction(actionName: string): boolean {
        return objectUtil.has(this.#propertyDefinition, actionName);
    }

    stop(): void {
        this.#stopFlag = true;
    }
}

/**
 * Property-based Convert Engine Class
 */
class ConvertEngine {
    #defaultActions: Action[];
    #publicActions: Action[];
    #propertiesMap: Record<string, PropertyDefinition[]>;

    constructor(actions: { default?: Action[]; public?: Action[] }) {
        this.#defaultActions = (objectUtil.get(actions, 'default', []) ?? []) as Action[];
        this.#publicActions = (objectUtil.get(actions, 'public', []) ?? []) as Action[];
        this.#propertiesMap = getMergedAS3Properties();
    }

    get propertiesMap(): Record<string, PropertyDefinition[]> {
        return this.#propertiesMap;
    }

    /**
     * Log TMSH properties that are not recognized by AS3 Core (cannot be found in properties.json)
     */
    #logSkippedProperties(
        objectCtx: ObjectContext,
        tmosConfigKey: string,
        tmosConfigObject: Record<string, any>,
        options: ConvertOptions | null,
        retryFlag: boolean = false
    ): void {
        if (
            options && options.accConfig && options.accConfig.jsonLogs
            && options.tmshHeader && options.originalTmshHeader) {
            const as3Props = objectCtx.definitions.map((prop) => prop.id);
            for (const tmosProp of Object.keys(tmosConfigObject)) {
                if (!constants.JSON_LOGS.PROPERTIES_NOT_TO_LOG.includes(tmosProp)
                && !as3Props.includes(tmosProp)
                && !retryFlag) {
                    options.accConfig.requestContext?.logSkipTmshProperty({
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
     */
    #addTmshInfoForOriginValue(propertyCtx: PropertyContext, tmshHeader: string | symbol): any {
        // add to each node tmsh header and path
        const propWithTmshInfo = objectUtil.cloneDeep(propertyCtx.convertedPropertyValue);
        traverseJSON(propWithTmshInfo, (parent: any, key: string | number, _depth?: number, _stop?: () => void, pathInternal?: (string | number)[]) => {
            const path = pathInternal ?? [];
            /* update only the original properties
                do not get into an infinite loop with tmsh properties */
            if (key !== 'tmshHeader' && key !== 'tmshPath'
                && !path.includes('tmshHeader')
                && !path.includes('tmshPath')
            ) {
                // reconstruct the path to the property within tmsh object
                const pathArray: (string | number)[] = [...path];
                pathArray.unshift(propertyCtx.tmosPropertyKey);
                pathArray.push(key);
                let bigObj: any = null;
                while (pathArray.length > 0) {
                    bigObj = { [pathArray.pop()!]: bigObj };
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
     */
    async convert(
        tmosConfigKey: string,
        tmosConfigObject: Record<string, any>,
        options: ConvertOptions | null,
        tmshPath: string | null = null,
        retryFlag: boolean = false
    ): Promise<Record<string, any>> {
        const objectCtx = new ObjectContext(this, tmosConfigKey, tmosConfigObject);
        if (objectCtx.isSupported()) {
            this.#logSkippedProperties(objectCtx, tmosConfigKey, tmosConfigObject, options, retryFlag);
            await this.#runWithCtx(objectCtx, options, tmshPath);
        }
        return objectCtx.convertedData;
    }

    async #runWithCtx(objectCtx: ObjectContext, options: ConvertOptions | null, tmshPathObj: string | null = null): Promise<void> {
        // handling empty path for global object
        let path: string | symbol;
        let existingPath: string[] | undefined;
        let headerValue: string | undefined;
        let tmshPathNestedValue: string | null = null;
        let tmshpathValue: any = null;
        if (options && options.accConfig && options.tmshHeader && options.originalTmshHeader) {
            // Match either quoted strings or non-space characters and remove quotes
            const matches = options.tmshHeader.match(/"([^"]+)"|(\S+)/g);
            path = matches?.pop()?.replace(/"/g, '') ?? '';
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
                if (existingProperty && lodashIsEmpty(globalObjectUtil.getTmshInfo(existingPath, existingProperty))) {
                    tmshPathArr.forEach((_currentPath, index) => {
                        if (index + 1 in tmshPathArr) {
                            const subPath = tmshPathArr.slice(0, index + 1).join('/');
                            tmshPath += `/${tmshPathArr[index + 1]}`;
                            globalObjectUtil.addProperty(
                                subPath,
                                tmshPathArr[index + 1]!,
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
                splittedPath.pop()!,
                headerValue,
                { [splittedPath.join('/')]: null }
            );
        } else {
            path = objectPropertyPath;
            if (objectPropertyPath !== NO_VALUE && objectTmshHeader !== NO_VALUE) {
                path = objectPropertyPath;
                headerValue = objectTmshHeader as string;
            }
        }
        for (const def of objectCtx.definitions) {
            const tmosObject = objectCtx.tmosConfigObject;
            if (!(objectUtil.has(def, 'id') && objectUtil.has(tmosObject, [def.id!]))) {
                continue;
            }

            const propertyCtx = new PropertyContext(
                objectCtx,
                def.id!,
                tmosObject[def.id!],
                def
            );
            for (const action of this.#publicActions) {
                if (!propertyCtx.isActive()) {
                    if (typeof path === 'string' && propertyCtx.hasAction('altId')) {
                        globalObjectUtil.addProperty(
                            path,
                            propertyCtx.getActionValue(action.name),
                            headerValue!,
                            { [propertyCtx.tmosPropertyKey]: null }
                        );
                    }
                    break;
                }

                if (propertyCtx.hasAction(action.name)) {
                    if (
                        action.name === 'extend'
                        && propertyCtx.getActionValue(action.name) === 'object'
                    ) {
                        objectPropertyPath = path;
                        objectTmshHeader = headerValue!;
                        if (tmshPathObj) {
                            tmshPathObj = `${tmshPathObj}/${propertyCtx.tmosPropertyKey}`;
                        } else {
                            tmshPathObj = propertyCtx.tmosPropertyKey;
                        }
                    }
                    await action.action(propertyCtx, propertyCtx.getActionValue(action.name), tmshPathObj);
                    if (options) {
                        tmshPathObj = null;
                    }
                    if (action.name === 'altId' && typeof path === 'string') {
                        if (tmshPathObj) {
                            tmshPathNestedValue = `${tmshPathObj}/${propertyCtx.tmosPropertyKey}`;
                            tmshpathValue = parseNestedString(tmshPathNestedValue);
                        } else {
                            tmshpathValue = { [propertyCtx.tmosPropertyKey]: null };
                        }
                        globalObjectUtil.addProperty(
                            path,
                            propertyCtx.getActionValue(action.name),
                            headerValue!,
                            tmshpathValue
                        );
                        if (options && options.accConfig && options.accConfig.jsonLogs) {
                            options.accConfig.requestContext?.logRenameProperty({
                                tmshHeader: headerValue,
                                tmshPath: tmshpathValue,
                                property: propertyCtx.convertedPropertyKey,
                                reason: 'reverse translation of an AS3 Core property to comply with the schema'
                            });
                        }
                    }
                }
            }
            if (!propertyCtx.hasAction('altId') && typeof path === 'string') {
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
                    headerValue!,
                    tmshpathValue
                );
            }
            for (const action of this.#defaultActions) {
                if (!propertyCtx.isActive()) {
                    if (!propertyCtx.hasAction('altId')
                        && !(propertyCtx.tmosPropertyKey
                            === hyphensToCamel(propertyCtx.tmosPropertyKey)
                        ) && typeof path === 'string') {
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
                await action.action(propertyCtx, options, path as string);
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
                        if (typeof path === 'string') {
                            globalObjectUtil.addProperty(
                                path,
                                propName,
                                headerValue!,
                                tmshpathValue
                            );
                        }
                    } else {
                        // object
                        if (tmshPathObj) {
                            tmshPathNestedValue = `${tmshPathObj}/${propertyCtx.tmosPropertyKey}`;
                            tmshpathValue = parseNestedString(tmshPathNestedValue);
                        } else {
                            tmshpathValue = { [propertyCtx.tmosPropertyKey]: null };
                        }
                        if (typeof path === 'string') {
                            globalObjectUtil.addProperty(
                                path,
                                propName,
                                headerValue!,
                                tmshpathValue,
                                null,
                                this.#addTmshInfoForOriginValue(propertyCtx, headerValue!)
                            );
                        }
                    }
                } else if (action.name === 'defaultAltId' && !propertyCtx.hasAction('altId') && !(propertyCtx.tmosPropertyKey === hyphensToCamel(propertyCtx.tmosPropertyKey)) && typeof path === 'string') {
                    globalObjectUtil.moveProperty(
                        path,
                        propertyCtx.tmosPropertyKey,
                        path,
                        hyphensToCamel(propertyCtx.tmosPropertyKey)
                    );
                    if (options && options.accConfig && options.accConfig.jsonLogs) {
                        options.accConfig.requestContext?.logRenameProperty({
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
                    if (typeof path === 'string') {
                        globalObjectUtil.moveAll(
                            path,
                            propName,
                            path,
                            propertyCtx.convertedPropertyKey
                        );
                    }
                    if (options && options.accConfig && options.accConfig.jsonLogs) {
                        options.accConfig.requestContext?.logRenameProperty({
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

export default ConvertEngine;
module.exports = ConvertEngine;
module.exports.NO_VALUE = NO_VALUE;
