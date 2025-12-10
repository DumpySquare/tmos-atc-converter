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

const f5AppSvcsSchema = require('@automation-toolchain/f5-appsvcs-schema');
const as3Next = require('@automation-toolchain/f5-appsvcs-schema/artifacts/schema-next.json');
const as3Classic = require('@automation-toolchain/f5-appsvcs-classic-schema/schema/adc-schema');
const assert = require('./testUtils/assert');
const constants = require('../src/constants');
const accPackage = require('../package.json');

// Isolate schemaVersion to make lines below more readable
const as3NextSchema = as3Next.definitions.ADC.properties.schemaVersion.anyOf;
let as3NextSchemaVersion;
as3NextSchema.forEach((key) => {
    if (Object.hasOwn(key, 'const')) {
        as3NextSchemaVersion = key.const;
    }
});
const as3ClassicSchemaVersion = as3Classic.properties.schemaVersion.anyOf[1].const;

/**
 * This unit test is self explanatory:
 * - kind a like guardian to prevent unwanted/accidental changes
 * - the source code relies on constants, so it should avoid the above
 */

describe('Test Constants (src/constants.js)', () => {
    it('should be untouched', () => {
        assert.deepStrictEqual(
            constants,
            {
                CIPHER_SUFFIX: '_rule',
                COMMON: {
                    TMOS: {
                        MAX_NAME_LEN: 255,
                        PATH_SEP: '/'
                    }
                },
                JSON_LOGS: {
                    PROPERTIES_NOT_TO_LOG: [
                        'creation-time',
                        'defaults-from',
                        'last-modified-time'
                    ]
                },
                NEXT: {
                    CLASS_NAME_MAX_LEN: 62
                },
                PACKAGE: {
                    VERSION: {
                        ACC: accPackage.version,
                        AS3_SCHEMA: as3ClassicSchemaVersion,
                        SHARED_SCHEMA: as3NextSchemaVersion,
                        SHARED_SCHEMA_PACKAGE: f5AppSvcsSchema.getVersion()
                    }
                },
                SERVICES_WITH_POOL: [
                    'Service_Forwarding',
                    'Service_Generic',
                    'Service_HTTP',
                    'Service_HTTPS',
                    'Service_L4',
                    'Service_SCTP',
                    'Service_TCP',
                    'Service_UDP'
                ],
                GLOBAL_OBJECT_PATH_SEP: '/'
            },
            'Looks like constants.js was changed recently. Is it intentional or accidental change? Do not forget to update unit test or revert the change!'
        );
    });
});
