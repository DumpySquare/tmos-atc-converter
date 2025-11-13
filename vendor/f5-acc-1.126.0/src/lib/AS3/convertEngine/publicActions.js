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

const objectUtil = require('../../../util/object');
const prependObjProps = require('../../../util/convert/prependObjProps');
const unquote = require('../../../util/convert/unquote');

/**
 * Public actions for Convert Engine
 *
 * - Actions that applied at the beginning of the pipeline (before default actions).
 * - Any kind of actions (e.g. class specific and etc.)
 */

/**
 * Check if `set` contains the `value`
 *
 * @param {Array | any} set
 * @param {any} value
 *
 * @returns {boolean} true or false
 */
function setIncludesValue(set, value) {
    return (Array.isArray(set) ? set : [set]).includes(value);
}

/**
 * 'extend' action
 *
 * @param {PropertyContext} ctx
 * @param {string} actionType
 */
async function actionExtend(ctx, actionType, tmshPath = null) {
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
 *
 * @param {PropertyContext} ctx
 * @param {string} altId
 */
async function actionAlternativeID(ctx, altId) {
    ctx.convertedPropertyKey = altId;
}

/**
 * 'falsehood' action
 *
 * @param {PropertyContext} ctx
 * @param {string | Array<string>} falsehoodValues - supported values
 */
async function actionFalsehood(ctx, falsehoodValues) {
    if (setIncludesValue(falsehoodValues, ctx.tmosPropertyValue)) {
        ctx.convertedPropertyValue = false;
    }
}

/**
 * 'truth' action
 *
 * @param {PropertyContext} ctx
 * @param {string | Array<string>} truthValues - supported values
 */
async function actionTruth(ctx, truthValues) {
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
 *
 * @param {PropertyContext} ctx
 * @param {boolean} isQuoted - true if string quoted (value from AS3 merged properties)
 */
async function actionQuotedString(ctx, isQuoted) {
    if (isQuoted) {
        ctx.convertedPropertyValue = unquote(ctx.tmosPropertyValue);
    }
}

/**
 * NOTE: ORDER IS MATTERS
 */
module.exports = [
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
