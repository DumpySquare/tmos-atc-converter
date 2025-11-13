#!/usr/bin/env sh

# Check if variable defined or if not defined then sets it to 1
# $1 - variable name
# return 0 when variable doesn't exist
setifndef () {
    if test -n "$(eval "echo \"\$$1\"")"; then
        __bs_filename="${SOURCED_FILE}"
        if test "$#" -gt 1 && test -z "${__bs_filename}"; then
            __bs_filename="${2}"
        fi
        if test -n "${__SHELL_UTIL_DEFINED}"; then
            logwarn "Script \"${__bs_filename}\" loaded already!"
        else
            printf "WARN: Script \"%s\" loaded already!\n" "${__bs_filename}" 1>&2
        fi
        return 1
    fi
    eval "${1}=1"
    return 0
}

setifndef "__BOOTSTRAP_DEFINED" "bootstrap.sh" || return 0

# Sets SOURCED_FILE env var, then
# reads and executes commands from file
# - $1 - path to file. If nor absolte nor relative
#        then it will be converted to relative path
# returns 0 on success
require () {
    if test -z "${1}"; then
        logerror "No file provided to 'require' function!"
        return 1
    fi

    _path="${1}"
    if test "$(printf %.1s "${_path}")" != "/" && \
        test "$(printf %.2s "${_path}")" != "./" && \
        test "$(printf %.3s "${_path}")" != "../";
    then
        _path="./${_path}"
    fi

    export SOURCED_FILE="${_path}"
    # shellcheck disable=SC1090
    . "${_path}"

    # cleanup variable
    export SOURCED_FILE=
}