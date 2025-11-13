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

const Ajv2020 = require('ajv/dist/2020');

const jsonLogsSchema = require('../../src/processingLog/log.schema.json');

class AjvValidator {
    constructor() {
        const ajv = new Ajv2020(
            {
                allErrors: true,
                strict: true
            }
        );
        this.validator = ajv.compile(jsonLogsSchema);
    }

    /**
     * Validate object.
     *
     * @param {any} data - object for validation
     *
     * @returns {Object} validation results
     */
    validate(data) {
        const isValid = this.validator(data);
        return Promise.resolve({
            isValid,
            errors: this.validator?.errors ?? []
        });
    }
}

const JsonValidator = new AjvValidator();

module.exports = (data) => JsonValidator.validate(data);
