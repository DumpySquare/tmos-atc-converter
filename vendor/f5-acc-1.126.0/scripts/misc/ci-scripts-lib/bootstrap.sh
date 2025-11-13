#!/usr/bin/env sh

set -e

printf "Loading all required scripts...\n" 1>&2

__ci_bs_dirname=$(dirname "$BS_FILE")
# shellcheck disable=SC1091
. "${__ci_bs_dirname}/../scripts-lib/bootstrap.sh" || exit 1

setifndef "__CI_BOOTSTRAP_DEFINED" "ci-scripts-bootstrap.sh" || return 0

require "${__ci_bs_dirname}/../scripts-lib/shell.sh" \
    || exit 1

if debugEnabled; then
    loginfo "Enabling debug output"
    set -evx
fi

loginfo "Base scripts loaded."

require "${__ci_bs_dirname}/utils.sh" \
    && loginfo "Utils loaded" \
    && require "${__ci_bs_dirname}/vars.sh" \
    && loginfo "Variables initialized" \
    || exit 1

loginfo "Creating directory to store artifacts"
# shellcheck disable=SC2034
DIST_DIR=$(create_dist_dir)