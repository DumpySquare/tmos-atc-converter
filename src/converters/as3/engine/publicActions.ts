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

import objectUtil from '../../../utils/object';
import prependObjProps from '../../../utils/prependObjProps';
import unquote from '../../../utils/unquote';

export interface PropertyContext {
    engine: {
        convert: (key: string, value: any, ctx: null, tmshPath: string | null) => Promise<any>;
    };
    tmosConfigKey: string;
    tmosPropertyKey: string;
    tmosPropertyValue: any;
    configHandler: any;
    convertedData: Record<string, any>;
    convertedPropertyKey: any;
    convertedPropertyValue: any;
    stop: () => void;
}

export interface Action {
    name: string;
    action: (ctx: PropertyContext, value: any, tmshPath?: string | null) => Promise<void>;
}

/**
 * Public actions for Convert Engine
 *
 * - Actions that applied at the beginning of the pipeline (before default actions).
 * - Any kind of actions (e.g. class specific and etc.)
 */

/**
 * Check if `set` contains the `value`
 */
function setIncludesValue(set: any[] | any, value: any): boolean {
    return (Array.isArray(set) ? set : [set]).includes(value);
}

/**
 * 'extend' action
 */
async function actionExtend(ctx: PropertyContext, actionType: string, tmshPath: string | null = null): Promise<void> {
    let stopPipeline = false;
    if (actionType === 'object') {
        let recurse = await ctx.engine.convert(`${ctx.tmosConfigKey} ${ctx.tmosPropertyKey}`, ctx.tmosPropertyValue, null, tmshPath);
        // determine if remap/prepend props is required
        if (objectUtil.get(ctx.configHandler, 'prependProps', []).includes(ctx.tmosPropertyKey)) {
            recurse = prependObjProps(recurse, ctx.tmosPropertyKey);
        }
        // attach directly to new object
        Object.assign(ctx.convertedData, recurse);
        stopPipeline = true;
    } else if (actionType === 'array') {
        if (ctx.tmosPropertyValue === 'none') {
            // don't convert empty arrays
            stopPipeline = true;
        } else if (Array.isArray(ctx.tmosPropertyValue)) {
            ctx.convertedPropertyValue = ctx.tmosPropertyValue;
        }
    }
    if (stopPipeline) {
        ctx.stop();
    }
}

/**
 * 'altId' action
 */
async function actionAlternativeID(ctx: PropertyContext, altId: string): Promise<void> {
    ctx.convertedPropertyKey = altId;
}

/**
 * 'falsehood' action
 */
async function actionFalsehood(ctx: PropertyContext, falsehoodValues: string | string[]): Promise<void> {
    if (setIncludesValue(falsehoodValues, ctx.tmosPropertyValue)) {
        ctx.convertedPropertyValue = false;
    }
}

/**
 * 'truth' action
 */
async function actionTruth(ctx: PropertyContext, truthValues: string | string[]): Promise<void> {
    if (setIncludesValue(truthValues, ctx.tmosPropertyValue)) {
        ctx.convertedPropertyValue = true;
    }
}

/**
 * 'quotedString' action
 *
 * Example 1:
 * ltm virtual VS {
 *     description "test test" <---- quoted string
 * }
 *
 * ctx.tmosPropertyValue === "\"test test \""
 *
 * Example 2:
 * ltm virtual VS {
 *     description none
 * }
 *
 * ctx.tmosPropertyValue === "none"
 *
 * Note:
 *
 * AS3 sets "quotedString" to true when the value should be enclosed with quotation marks.
 * ACC reads "quotedString" (if set to true) as guidance to remove enclosing quotation marks.
 */
async function actionQuotedString(ctx: PropertyContext, isQuoted: boolean): Promise<void> {
    if (isQuoted) {
        ctx.convertedPropertyValue = unquote(ctx.tmosPropertyValue);
    }
}

/**
 * NOTE: ORDER IS MATTERS
 */
const publicActions: Action[] = [
    {
        name: 'extend',
        action: actionExtend
    },
    {
        name: 'altId',
        action: actionAlternativeID
    },
    {
        name: 'quotedString',
        action: actionQuotedString
    },
    {
        name: 'truth',
        action: actionTruth
    },
    {
        name: 'falsehood',
        action: actionFalsehood
    }
];

export default publicActions;
module.exports = publicActions;
