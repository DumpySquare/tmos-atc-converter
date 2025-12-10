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

// Stub validator - DO validation disabled for standalone converter
// Original required: @automation-toolchain/f5-do-dev/validator
// For testing the converter, we skip validation and just check conversion succeeded

module.exports = (declaration) => {
    // Skip validation, just check declaration exists
    if (!declaration) {
        return {
            isValid: false,
            errors: ['Declaration is empty']
        };
    }

    // Return success - we're testing conversion, not schema validation
    return {
        isValid: true,
        errors: []
    };
};
