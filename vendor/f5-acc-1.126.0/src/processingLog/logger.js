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

/* eslint-disable max-classes-per-file */

'use strict';

const camelCase = require('lodash/camelCase');
const pickProps = require('lodash/pick');
const inspect = require('util').inspect;

/**
 * Operations Logger Base Class
 */
class OperationsLogger {
    // instance private fields
    #messages = [];

    log(...messages) {
        messages.forEach((msg) => this.#messages.push(msg));
    }

    /**
     * Get all logged messages
     *
     * @returns {Array<Object>} logged messages
     */
    getLog() {
        return this.#messages;
    }
}

/**
 * Creates class derived from OperationsLogger for specific message prototypes
 *
 * @param {MessagePrototypes} messagePrototypes
 *
 * @returns {Object} class object
 */
module.exports = function classFabric(messagePrototypes) {
    /**
     * Concrete implementation for Operations Logger based on message prototypes data
     *
     * Note:
     * Method name to log particular message type will look like `logCamelCase`.
     * e.g. message type is 'kebab-case' then method name will be `logKebabCase`.
     */
    class ConcreteOperationsLogger extends OperationsLogger {
        // initialize dynamic methods on 'class' creation
        static {
            Object.keys(messagePrototypes).forEach((msgName) => {
                /**
                 * Process log message
                 *
                 * @param {...Object} messages - messages to process
                 */
                this.prototype[camelCase(`log-${msgName}`)] = function logMessage(...messages) {
                    const msgPrototype = messagePrototypes[msgName];
                    const fields = Object.keys(msgPrototype.fields);

                    messages.forEach((originMsg) => {
                        // pick required fields only
                        let filteredMsg = pickProps(originMsg, fields);

                        /* prototypes.js does not contain information about which properties are required,
                            so explicitly exempting 'removed-property' that allows optional properties */
                        if (msgName !== 'removed-property') {
                            if (Object.keys(filteredMsg).length < fields.length) {
                                throw new Error(
                                    'Message missing some required fields!'
                                    + `\nType: ${msgName}`
                                    + `\nFields: ${JSON.stringify(fields)}`
                                    + `\nMessage: ${inspect(originMsg, { depth: null, sorted: true })}`
                                );
                            }
                        }

                        if (msgPrototype.events && msgPrototype.events.onMessage) {
                            filteredMsg = msgPrototype.events.onMessage(originMsg, filteredMsg);
                        }

                        this.log(filteredMsg);
                    });
                };
            });
        }
    }
    return ConcreteOperationsLogger;
};
