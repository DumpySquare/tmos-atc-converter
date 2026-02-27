'use strict';

const Ajv = require('ajv');
const path = require('path');
const fs = require('fs');

const schemaDir = path.join(__dirname, 'schema', 'latest');

class DOValidator {
    constructor() {
        this.ajv = new Ajv({ allErrors: true, strict: false });
        // Load all DO schema files
        const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.json'));
        this.schemas = schemaFiles.map(f => {
            const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, f), 'utf8'));
            try {
                this.ajv.addSchema(schema);
            } catch (e) {
                // schema may already be added or have conflicts, continue
            }
            return schema;
        });
    }

    async validate(declaration) {
        const errors = [];
        for (const schema of this.schemas) {
            const validate = this.ajv.compile(schema);
            validate(declaration);
            if (validate.errors) {
                errors.push(...validate.errors);
            }
        }
        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : null
        };
    }
}

module.exports = DOValidator;
