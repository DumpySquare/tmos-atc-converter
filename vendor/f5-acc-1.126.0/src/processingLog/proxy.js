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

/**
 * Empty function to return when no target function available
 */
const emptyFunction = () => {};

/**
 * Set of traps for Proxy
 */
const handler = {
    /**
     * Trap for the [[Get]] (object internal method)
     *
     * @param {OperationsLogger} target
     * @param {string} prop
     * @param {Proxy} receiver
     *
     * @returns {any}
     */
    get(target, prop, receiver) {
        let value = emptyFunction;
        if (prop in target) {
            value = target[prop];
            if (value instanceof Function) {
                return function wrapper(...args) {
                    return value.apply(this === receiver ? target : this, args);
                };
            }
        }
        return value;
    }
};

/**
 * Create Proxy for OperationsLogger
 *
 * @param {OperationsLogger} target - target object to proxy
 *
 * @returns {Proxy} proxy
 */
module.exports = function proxy(target) {
    return new Proxy(target, handler);
};
