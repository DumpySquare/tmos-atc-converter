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

import hyphensToCamel from '../../../utils/hyphensToCamel';
import isNumber from '../../../utils/isNumber';
import { NO_VALUE } from './converter';
import objectUtil from '../../../utils/object';

export interface PropertyContext {
    convertedPropertyKey: any;
    convertedPropertyValue: any;
    convertedData: Record<string, any>;
    tmosPropertyKey: string;
    tmosPropertyValue: any;
    configHandler: any;
}

export interface ConvertOptions {
    accConfig?: any;
    tmshHeader?: string;
    originalTmshHeader?: string;
}

export interface Action {
    name: string;
    action: (ctx: PropertyContext, options?: ConvertOptions, path?: string) => Promise<void>;
}

/**
 * Default actions for Convert Engine
 *
 * - Actions that applied at the end of the pipeline (after public actions).
 * - Should be really basic actions, nothing class specific and etc.
 */

// do not parse props that could be string OR int (note: BIG-IP config)
// Monitor send/receive
const DEFAULT_INT_IGNORE = ['description', 'recv', 'recv-disable', 'send'];

/**
 * Use origin value as converted if needed
 */
async function defaultActionOriginValue(ctx: PropertyContext): Promise<void> {
    if (ctx.convertedPropertyValue === NO_VALUE) {
        ctx.convertedPropertyValue = objectUtil.cloneDeep(ctx.tmosPropertyValue);
    }
}

/**
 * Convert TMOS Config Object Property name to camelCase
 */
async function defaultActionAlternativeID(ctx: PropertyContext): Promise<void> {
    if (ctx.convertedPropertyKey === NO_VALUE) {
        ctx.convertedPropertyKey = hyphensToCamel(ctx.tmosPropertyKey);
    }
}

/**
 * Convert array to array of integers if needed
 */
async function defaultActionIntArray(ctx: PropertyContext): Promise<void> {
    if (ctx.convertedPropertyValue !== NO_VALUE
            && Array.isArray(ctx.convertedPropertyValue)) {
        const tmp = ctx.convertedPropertyValue
            .map((val: any) => (isNumber(val) ? parseInt(val, 10) : val));
        if (tmp.every((val: any) => Number.isFinite(val))) {
            ctx.convertedPropertyValue = tmp;
        }
    }
}

/**
 * Convert value to integer if needed
 */
async function defaultActionInteger(ctx: PropertyContext): Promise<void> {
    if (ctx.convertedPropertyValue !== NO_VALUE
            && !DEFAULT_INT_IGNORE.includes(ctx.tmosPropertyKey)
            && isNumber(ctx.convertedPropertyValue)) {
        ctx.convertedPropertyValue = parseInt(ctx.convertedPropertyValue, 10);
    }
}

/**
 * Custom handling based on TMOS Config Key
 */
async function defaultActionCustomHandling(ctx: PropertyContext, options?: ConvertOptions, path?: string): Promise<void> {
    if (ctx.convertedPropertyKey !== NO_VALUE && ctx.convertedPropertyValue !== NO_VALUE) {
        Object.assign(
            ctx.convertedData,
            objectUtil.get(
                ctx.configHandler,
                ['keyValueRemaps', ctx.convertedPropertyKey],
                (key: string, value: any) => ({ [key]: value })
            )(ctx.convertedPropertyKey, ctx.convertedPropertyValue, options, path)
        );
    }
}

/**
 * NOTE: ORDER IS MATTERS
 */
const defaultActions: Action[] = [
    {
        name: 'originValue',
        action: defaultActionOriginValue
    },
    {
        name: 'defaultAltId',
        action: defaultActionAlternativeID
    },
    {
        name: 'defaultIntArray',
        action: defaultActionIntArray
    },
    {
        name: 'defaultInteger',
        action: defaultActionInteger
    },
    {
        name: 'customHandling',
        action: defaultActionCustomHandling
    }
];

export default defaultActions;
module.exports = defaultActions;
