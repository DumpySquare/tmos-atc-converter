#!/usr/bin/env sh

set -e

if ! npm ls is-ci || npx is-ci;
then
    echo "Prod or CI env detected, skipping git-hooks injection!"
else
    echo "Dev env detected, injecting git-hooks!"
    npx husky install
    # shellcheck disable=SC2016
    npx husky set .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
    # shellcheck disable=SC2016
    npx husky set .husky/pre-commit 'if [ $(git rev-parse --abbrev-ref HEAD) = main ]; then echo "Commiting to MAIN prohibited!"; exit 1; fi'
fi
