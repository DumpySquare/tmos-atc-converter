#!/bin/sh
# Check certs have test CN.

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)

echo "Check that there aren't any certs on the file system..."

# Get list of all cert files
cert_files=$(find "${script_dir}/../.." -name \*.crt)

unset failed
for cert_file in $cert_files; do
    # Check that cert is in test/certs directory
    echo "Found cert file: ${cert_file}"
    failed=true
done

if [ -n "$failed" ]; then
    echo "Failed - Unexpected *.crt files found"
    exit 1
else
    echo "Passed - No *.crt files found"
fi
