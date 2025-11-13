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

const assignDefaults = require('lodash/defaultsDeep');
const cloneDeep = require('lodash/cloneDeep');

const f5AppSvcsSchema = require('@automation-toolchain/f5-appsvcs-schema');
const nextSchema = require('@automation-toolchain/f5-appsvcs-schema/artifacts/schema-next.json');

class NextValidator {
    #validator = null;

    /**
     * Compile JSON Schema
     */
    async compile() {
        this.#validator = new f5AppSvcsSchema.SchemaValidator('next');
        this.#validator.compile();
    }

    /**
     * * Clear the buffers after the response
    */
    async reset() {
        this.#validator = null;
    }

    /**
     * Validate a declaration.
     *
     * For more info about options and return value see official docs.
     *
     * @param {any} aDeclaration - declaration
     * @param {Object} [anOptions] - options
     * @param {'lazy' | 'strict'} [anOptions.mode = 'lazy']
     *
     * @returns {Object} validation results
     */
    async validate(aDeclaration, anOptions) {
        if (!this.#validator) {
            this.compile();
        }
        anOptions = assignDefaults(cloneDeep(anOptions), {
            mode: 'lazy',
            schemaType: 'declaration'
        });
        return this.#validator.validate(aDeclaration, anOptions);
    }
}

module.exports = new NextValidator();

/**
 * Get the package' version
 *
 * @returns {string} version
 */
module.exports.getPkgVersion = function getPkgVersion() {
    return f5AppSvcsSchema.getVersion();
};

/**
 * Get the NEXT Schema supported versions
 *
 * @returns {{ latest: string }} latest supported version
 */
module.exports.getSchemaVersion = function getSchemaVersion() {
    const versionData = nextSchema.definitions.ADC.properties.schemaVersion.anyOf;
    let versionSchema;
    versionData.forEach((key) => {
        if (Object.hasOwn(key, 'const')) {
            versionSchema = key.const;
        }
    });

    return {
        latest: versionSchema
    };
};
