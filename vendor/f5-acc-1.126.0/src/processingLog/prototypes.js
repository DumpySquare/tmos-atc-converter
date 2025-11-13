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
 * Set of message prototypes:
 *
 * Example:
 *  {
 *    'kebab-case': {
 *      fields: {
 *        field: 'some field description'
 *       },
 *       events: {
 *         onMessage: (origin, filtered) => {
 *           filtered.type = 'KEBAB';
 *           return filtered;
 *         }
 *       }
 *    }
 *  }
 */

/**
 * @type {MessagePrototypes}
 */
module.exports = {
    'added-object': {
        fields: {
            path: '/absolute/path/to/added/object',
            reason: 'addition reason',
            class: 'object class'
        },
        events: {
            onMessage: (origin, filtered) => {
                filtered.action = 'ADD_OBJECT';
                return filtered;
            }
        }
    },
    'skip-tmsh-property': {
        fields: {
            reason: 'reason of skip',
            tmshHeader: 'module class object-name',
            tmshPath: {
                'property-name': 'some value'
            },
            fix_text: 'fix text'
        },
        events: {
            onMessage: (origin, filtered) => {
                filtered.action = 'SKIP-TMSH-PROPERTY';
                return filtered;
            }
        }
    },
    'remove-property': {
        fields: {
            path: '/absolute/path/to/removed/property',
            tmshHeader: '/absolute/path/to/renamed/property',
            tmshPath: {
                'property-name': 'some value'
            },
            reason: 'removal reason',
            fix_text: 'fix text',
            internal_reason: 'internal reason'
        },
        events: {
            onMessage: (origin, filtered) => {
                filtered.action = 'REMOVE';
                return filtered;
            }
        }
    },
    'renamed-property': {
        fields: {
            path: '/absolute/path/to/renamed/property',
            reason: 'rename reason',
            origin: '/absolute/path/to/old/property'
        },
        events: {
            onMessage: (origin, filtered) => {
                filtered.action = 'RENAME AS3';
                return filtered;
            }
        }
    },
    'rename-property': {
        fields: {
            tmshHeader: '/absolute/path/to/renamed/property',
            property: 'property name',
            reason: 'rename reason',
            tmshPath: {
                'property-name': 'some value'
            }
        },
        events: {
            onMessage: (origin, filtered) => {
                filtered.action = 'RENAME';
                return filtered;
            }
        }
    },
    'changed-substring': {
        fields: {
            path: '/absolute/path/to/property',
            reason: 'change reason',
            origin: 'origin substring value',
            new: 'new substring value'
        },
        events: {
            onMessage: (origin, filtered) => {
                filtered.action = 'VALUE_SUBSTRING';
                return filtered;
            }
        }
    },
    'changed-value': {
        fields: {
            path: '/absolute/path/to/property',
            reason: 'change reason',
            origin: 'origin value',
            new: 'new value'
        },
        events: {
            onMessage: (origin, filtered) => {
                filtered.action = 'VALUE';
                return filtered;
            }
        }
    }
};
