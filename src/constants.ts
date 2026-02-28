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

/* eslint-disable @typescript-eslint/no-require-imports */

const accPackage = require('../package.json') as { version: string };
const adcSchema = require('./vendor/f5-appsvcs-classic-schema/schema/latest/adc-schema.json') as {
    properties: { schemaVersion: { anyOf: Array<{ const?: string }> } }
};

export interface TMOSConstants {
    MAX_NAME_LEN: number;
    PATH_SEP: string;
}

export interface CommonConstants {
    TMOS: TMOSConstants;
}

export interface JSONLogsConstants {
    PROPERTIES_NOT_TO_LOG: string[];
}

export interface NextConstants {
    CLASS_NAME_MAX_LEN: number;
}

export interface PackageVersionConstants {
    ACC: string;
    AS3_SCHEMA: string;
}

export interface PackageConstants {
    VERSION: PackageVersionConstants;
}

export interface Constants {
    CIPHER_SUFFIX: string;
    COMMON: CommonConstants;
    JSON_LOGS: JSONLogsConstants;
    NEXT: NextConstants;
    PACKAGE: PackageConstants;
    SERVICES_WITH_POOL: string[];
    GLOBAL_OBJECT_PATH_SEP: string;
}

const constants: Constants = {
    // sometimes we have cipher groups and rules with the same name, we use that suffix to separate that
    CIPHER_SUFFIX: '_rule',
    // common for all modules and types of declarations
    COMMON: {
        TMOS: {
            MAX_NAME_LEN: 255, // max length for a path starting from v11 (v10 and earlier 1024+ chars)
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
    // as3-next only
    NEXT: {
        // max len for tenant, app and obj
        CLASS_NAME_MAX_LEN: 62
    },
    PACKAGE: {
        VERSION: {
            ACC: accPackage.version,
            AS3_SCHEMA: adcSchema.properties.schemaVersion.anyOf[1]?.const ?? '3.52.0'
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
    // separator used in globalObjectUtil parsing
    GLOBAL_OBJECT_PATH_SEP: '/'
};

export default constants;

// CommonJS export for backward compatibility with JS files
module.exports = constants;
