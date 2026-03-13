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
import Ajv from 'ajv';
import cloneDeep from 'lodash/cloneDeep';

const adcSchema = require('../vendor/f5-appsvcs-classic-schema/schema/latest/adc-schema.json');

export interface ValidateOptions {
    mode?: 'lazy' | 'strict';
}

export interface ValidationResult {
    isValid: boolean;
    data: any;
    errors: any[];
    ignoredAttributes?: string[];
    ignoredAttributesErrors?: any[];
}

export interface SchemaVersionInfo {
    latest: string;
    earliest: string;
}

class ClassicValidator {
    #ajv: Ajv | null = null;
    #validate: any = null;

    /**
     * Compile JSON Schema
     */
    async compile(): Promise<void> {
        this.#ajv = new Ajv({
            allErrors: true,
            strict: false,
            useDefaults: false,
            validateFormats: false
        });
        this.#validate = this.#ajv.compile(adcSchema);
    }

    /**
     * Validate a declaration.
     *
     * In 'lazy' mode, removes invalid properties and returns them in ignoredAttributes.
     * In 'strict' mode, fails on first error.
     *
     * @param aDeclaration - declaration
     * @param anOptions - options
     * @returns validation results
     */
    async validate(aDeclaration: any, anOptions?: ValidateOptions): Promise<ValidationResult> {
        if (!this.#validate) {
            await this.compile();
        }

        const mode = anOptions?.mode ?? 'lazy';
        const data = cloneDeep(aDeclaration);
        const ignoredAttributes: string[] = [];
        const ignoredAttributesErrors: any[] = [];

        if (mode === 'lazy') {
            // Iteratively validate and remove invalid properties
            let maxIterations = 100;
            while (maxIterations-- > 0) {
                const valid = this.#validate!(data);
                if (valid || !this.#validate!.errors?.length) break;

                // Find additionalProperties errors to remove
                const additionalPropError = this.#validate!.errors.find(
                    (e: any) => e.keyword === 'additionalProperties'
                );
                if (!additionalPropError) break;

                const path = `${additionalPropError.instancePath}/${additionalPropError.params.additionalProperty}`;
                ignoredAttributes.push(path);
                ignoredAttributesErrors.push(additionalPropError);

                // Delete the property from data
                const parts = path.split('/').filter(Boolean);
                let obj = data;
                for (let i = 0; i < parts.length - 1; i++) {
                    obj = obj[parts[i]!];
                    if (!obj) break;
                }
                if (obj && parts.length > 0) {
                    delete obj[parts[parts.length - 1]!];
                }
            }

            const valid = this.#validate!(data);
            return {
                isValid: valid,
                data,
                errors: valid ? [] : (this.#validate!.errors ?? []),
                ignoredAttributes,
                ignoredAttributesErrors
            };
        }

        // Strict mode
        const valid = this.#validate!(data);
        return {
            isValid: valid,
            data,
            errors: valid ? [] : (this.#validate!.errors ?? [])
        };
    }

    /**
     * Clear the buffers after response is send
     */
    async reset(): Promise<void> {
        this.#ajv = null;
        this.#validate = null;
    }
}

const classicValidatorInstance = new ClassicValidator();

/**
 * Get the Classic Schema supported versions
 *
 * @returns latest and earliest supported versions
 */
function getSchemaVersion(): SchemaVersionInfo {
    return {
        latest: adcSchema.properties.schemaVersion.anyOf[1]?.const ?? '3.52.0',
        earliest: '3.0.0'
    };
}

/**
 * Get the package version
 *
 * @returns version
 */
function getPkgVersion(): string {
    return '1.4.0';
}

export { getPkgVersion, getSchemaVersion };
export default classicValidatorInstance;

// CommonJS exports for backward compatibility
module.exports = classicValidatorInstance;
module.exports.getPkgVersion = getPkgVersion;
module.exports.getSchemaVersion = getSchemaVersion;
