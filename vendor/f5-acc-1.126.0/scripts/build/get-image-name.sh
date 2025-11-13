#!/usr/bin/env sh

cibsfile="$(dirname "${0}")/../misc/ci-scripts-lib/bootstrap.sh"
# shellcheck disable=SC1090
BS_FILE="${cibsfile}" . "${cibsfile}" || exit 1
unset cibsfile

main () {
    if test "${1}" = "tag"; then
        get_from_storage "${PUBLISHED_ARTIFACTS_DATA}" "Docker Image Tag Build Artifact" || return 1
    elif test "${1}" = "name"; then
        get_from_storage "${PUBLISHED_ARTIFACTS_DATA}" "Docker Image Name Build Artifact" || return 1
    else
        get_from_storage "${PUBLISHED_ARTIFACTS_DATA}" "Docker Image Build Artifact" || return 1
    fi
}

main "$@"
