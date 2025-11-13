#!/bin/sh
# Generate test certs to be used by unit tests

cert_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)/../../test_certs

# Exit if cert directory already exists
if [ -d "$cert_dir" ]; then
    exit 0
fi 

echo "Create keys/certs for tests in ${cert_dir}..."

# Create certs directory
mkdir -p "$cert_dir"

# Common subject
subject="/C=US/ST=WA/O=F5, Inc./CN=test.domain.com"

# Create root CA key/cert
openssl genrsa -out "$cert_dir"/test-root-ca.key 4096
openssl req -x509 -sha256 -new -nodes -subj "$subject" -key "$cert_dir"/test-root-ca.key -days 3650 -out "$cert_dir"/test-root-ca.crt

# Create intermediate CA key/cert

openssl genrsa -out "$cert_dir"/test-intermediate-ca.key 4096
openssl req -x509 -sha256 -new -nodes -subj "$subject" -key "$cert_dir"/test-intermediate-ca.key -days 3650 -out "$cert_dir"/test-intermediate-ca.crt

# Create CA bundle

cat "$cert_dir"/test-root-ca.crt "$cert_dir"/test-intermediate-ca.crt > "$cert_dir"/test-ca-bundle.crt

# Create certs signed by CA; Create CSRs; Sign CSRs using root CA key
for cert_index in $(seq 1 3); do
    openssl req -x509 -nodes -newkey rsa:4096 -keyout "$cert_dir"/"test-cert-${cert_index}.key" -out "${cert_dir}/test-cert-${cert_index}.crt" -subj "$subject" -sha256 -days 3650
done
