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

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

const AjvValidator = require('@automation-toolchain/f5-do/validator') as new () => DOValidatorInstance;

interface DOValidatorInstance {
    validate: (declaration: any) => Promise<DOValidationResult>;
}

export interface DOValidationResult {
    isValid: boolean;
    errors: DOValidationError[] | null;
}

export interface DOValidationError {
    keyword: string;
    dataPath?: string;
    instancePath?: string;
    schemaPath: string;
    params: Record<string, any>;
    message?: string;
}

/**
 * DO (Declarative Onboarding) Schema Validator
 */
class DOValidator {
    #validator: DOValidatorInstance | null = null;

    /**
     * Initialize the validator (compiles schema on first use)
     */
    #ensureValidator(): DOValidatorInstance {
        if (!this.#validator) {
            this.#validator = new AjvValidator();
        }
        return this.#validator;
    }

    /**
     * Validate a DO declaration against the schema.
     *
     * @param declaration - DO declaration to validate
     * @returns Validation result with isValid flag and any errors
     *
     * @example
     * ```typescript
     * const result = await doValidator.validate(declaration);
     * if (!result.isValid) {
     *     console.error('Validation errors:', result.errors);
     * }
     * ```
     */
    async validate(declaration: any): Promise<DOValidationResult> {
        const validator = this.#ensureValidator();
        return validator.validate(declaration);
    }

    /**
     * Reset the validator instance (useful for testing or memory management)
     */
    reset(): void {
        this.#validator = null;
    }
}

const doValidatorInstance = new DOValidator();

export default doValidatorInstance;

// CommonJS exports for backward compatibility
module.exports = doValidatorInstance;
