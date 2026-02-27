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
import assignDefaults from 'lodash/defaultsDeep';
import cloneDeep from 'lodash/cloneDeep';

interface SchemaValidatorInstance {
    compile: () => Promise<void>;
    validate: (declaration: any, options: ValidateOptions) => Promise<ValidationResult>;
}

export interface ValidateOptions {
    mode?: 'lazy' | 'strict';
}

export interface ValidationResult {
    valid: boolean;
    errors?: any[];
}

export interface SchemaVersionInfo {
    latest: string;
    earliest: string;
}

// Lazy-load the heavy classic-schema validation chain only when actually needed
let _f5AppSvcsSchema: {
    SchemaValidator: new () => SchemaValidatorInstance;
    getVersion: () => string;
    getSchemaVersion: () => SchemaVersionInfo;
} | null = null;

function getSchema(): NonNullable<typeof _f5AppSvcsSchema> {
    if (!_f5AppSvcsSchema) {
        try {
            _f5AppSvcsSchema = require('@automation-toolchain/f5-appsvcs-classic-schema');
        } catch {
            throw new Error(
                'AS3 schema validation requires @automation-toolchain/f5-appsvcs-classic-schema. '
                + 'This package is not available in bundled/extension mode.'
            );
        }
    }
    return _f5AppSvcsSchema!;
}

class ClassicValidator {
    #validator: SchemaValidatorInstance | null = null;

    /**
     * Compile JSON Schema
     */
    async compile(): Promise<void> {
        this.#validator = new (getSchema().SchemaValidator)();
        await this.#validator.compile();
    }

    /**
     * Validate a declaration.
     *
     * For more info about options and return value see official docs.
     *
     * @param aDeclaration - declaration
     * @param anOptions - options
     * @returns validation results
     */
    async validate(aDeclaration: any, anOptions?: ValidateOptions): Promise<ValidationResult> {
        if (!this.#validator) {
            await this.compile();
        }
        const options = assignDefaults(cloneDeep(anOptions ?? {}), {
            mode: 'lazy'
        }) as ValidateOptions;
        return this.#validator!.validate(aDeclaration, options);
    }

    /**
     * Clear the buffers after response is send
     */
    async reset(): Promise<void> {
        this.#validator = null;
    }
}

const classicValidatorInstance = new ClassicValidator();

/**
 * Get the package' version
 *
 * @returns version
 */
function getPkgVersion(): string {
    return getSchema().getVersion();
}

/**
 * Get the Classic Schema supported versions
 *
 * @returns latest and earliest supported versions
 */
function getSchemaVersion(): SchemaVersionInfo {
    return getSchema().getSchemaVersion();
}

export { getPkgVersion, getSchemaVersion };
export default classicValidatorInstance;

// CommonJS exports for backward compatibility
module.exports = classicValidatorInstance;
module.exports.getPkgVersion = getPkgVersion;
module.exports.getSchemaVersion = getSchemaVersion;
