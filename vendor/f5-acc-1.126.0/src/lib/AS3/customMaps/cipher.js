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

const handleObjectRef = require('../../../util/convert/handleObjectRef');
const GlobalObject = require('../../../util/globalRenameAndSkippedObject');

const defaultRules = ['/Common/f5-default', '/Common/f5-secure'];
const CIPHER_SUFFIX = require('../../../constants').CIPHER_SUFFIX;

module.exports = {

    // Cipher
    'ltm cipher rule': {
        class: 'Cipher_Rule',

        keyValueRemaps: {
            dhGroups: (key, val) => ({ namedGroups: val.split(':') }),
            cipher: (key, val, options, path) => {
                GlobalObject.moveProperty(path, key, path, 'cipherSuites');
                return { cipherSuites: val.split(':') };
            },
            signatureAlgorithms: (key, val) => ({ signatureAlgorithms: val.split(':') })
        }
    },

    // Cipher_Group
    'ltm cipher group': {
        class: 'Cipher_Group',

        keyValueRemaps: {
            allowCipherRules: (key, val) => ({
                allowCipherRules: Object.keys(val).map((x) => {
                    if (defaultRules.includes(x)) {
                        return handleObjectRef(x);
                    }
                    return handleObjectRef(`${x}${CIPHER_SUFFIX}`);
                })
            }),

            excludeCipherRules: (key, val) => ({
                excludeCipherRules: Object.keys(val).map((x) => {
                    if (defaultRules.includes(x)) {
                        return handleObjectRef(x);
                    }
                    return handleObjectRef(`${x}${CIPHER_SUFFIX}`);
                })
            }),

            requireCipherRules: (key, val) => ({
                requireCipherRules: Object.keys(val).map((x) => {
                    if (defaultRules.includes(x)) {
                        return handleObjectRef(x);
                    }
                    return handleObjectRef(`${x}${CIPHER_SUFFIX}`);
                })
            })
        }
    }
};
