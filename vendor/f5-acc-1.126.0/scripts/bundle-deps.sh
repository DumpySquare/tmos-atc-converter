#!/bin/bash

# Build script to bundle local dependencies
# This would extract and include dependency sources directly

echo "Bundling local dependencies..."

# Create a bundled dependencies directory
mkdir -p src/bundled

# Extract dependencies into bundled directory
cd deps
for file in *.tgz; do
    if [[ $file != *"dev"* ]]; then  # Skip dev dependencies
        echo "Extracting $file..."
        tar -xzf "$file" -C ../src/bundled/
    fi
done

echo "Dependencies bundled successfully"