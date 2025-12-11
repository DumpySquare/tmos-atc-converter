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
// @ts-nocheck - Map files use dynamic property access patterns

import handleObjectRef from '../../../utils/handleObjectRef';
import GlobalObject from '../../../utils/globalRenameAndSkippedObject';
import { CIPHER_SUFFIX } from '../../../constants';

const defaultRules = ['/Common/f5-default', '/Common/f5-secure'];

const cipherMap = {

    // Cipher
    'ltm cipher rule': {
        class: 'Cipher_Rule',

        keyValueRemaps: {
            dhGroups: (key: string, val: any) => ({ namedGroups: val.split(':') }),
            cipher: (key: string, val: any, options: any, path: any) => {
                GlobalObject.moveProperty(path, key, path, 'cipherSuites');
                return { cipherSuites: val.split(':') };
            },
            signatureAlgorithms: (key: string, val: any) => ({ signatureAlgorithms: val.split(':') })
        }
    },

    // Cipher_Group
    'ltm cipher group': {
        class: 'Cipher_Group',

        keyValueRemaps: {
            allowCipherRules: (key: string, val: any) => ({
                allowCipherRules: Object.keys(val).map((x) => {
                    if (defaultRules.includes(x)) {
                        return handleObjectRef(x);
                    }
                    return handleObjectRef(`${x}${CIPHER_SUFFIX}`);
                })
            }),

            excludeCipherRules: (key: string, val: any) => ({
                excludeCipherRules: Object.keys(val).map((x) => {
                    if (defaultRules.includes(x)) {
                        return handleObjectRef(x);
                    }
                    return handleObjectRef(`${x}${CIPHER_SUFFIX}`);
                })
            }),

            requireCipherRules: (key: string, val: any) => ({
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

export default cipherMap;
module.exports = cipherMap;
