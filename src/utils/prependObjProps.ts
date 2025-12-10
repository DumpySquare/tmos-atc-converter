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

import upperFirst from 'lodash/upperFirst';

/**
 * Prepend a `prefix` to all keys in `obj`
 *
 * @param obj - object to transform
 * @param prefix - prefix to prepend to each key
 * @returns new object with updated keys
 */
function prependObjProps<T>(obj: Record<string, T>, prefix: string): Record<string, T> {
    return Object.fromEntries(
        Object.entries(obj)
            .map(([key, value]) => [
                `${prefix}${upperFirst(key)}`,
                value
            ])
    );
}

export default prependObjProps;
module.exports = prependObjProps;
