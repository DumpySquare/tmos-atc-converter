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

const loggerFabric = require('./logger');
const loggerProxy = require('./proxy');
const prototypes = require('./prototypes');

/**
 * Operations Logger fabric
 *
 * @returns {Proxy} proxy for OperationsLogger
 */
module.exports = function fabric() {
    const LoggerClass = loggerFabric(prototypes);
    return loggerProxy(new LoggerClass());
};

/**
 * SHARED TYPEDEFS
 *
 * @callback OnMessage
 * @param {Object} origin - origin message (all fields)
 * @param {Object} filtered - filtered message (required fields only)
 *
 *
 * @typedef MessagePrototype
 * @type {Object}
 * @property {Object} fields - required fields in the message with short decription
 * @property {Object} events - events handlers
 * @property {OnMessage} events.onMessage - handler for 'onMessage' event
 *
 *
 * @typedef MessagePrototypes
 * @type {Object<string, MessagePrototype>}
 *
 * NOTE:
 *
 * Key MUST BE in 'kebab-case'
 */
