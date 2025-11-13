#!/usr/bin/env sh

setifndef "__SHELL_UTIL_DEFINED" || return 0

__logLvl=
_log () {
    printf "[%s][%s] $*\n" "$(date +"%m-%d-%y %H:%M:%S")" "${__logLvl}" 1>&2
}

# Check if "debug" mode enabled
# returns 0 on success
debugEnabled () {
    test -n "${DEBUG}"
}

# Check if env vars are set
# - $1 - list of variables
# returns 0 on success when all vars are set
isEnvVarsSet () {(
    result=0
    for v in "$@"; do
        if test -z "$(eval echo "\$${v}")"; then
            logerror "Env var '${v}' is required!"
            result=1
        fi
    done
    return $result
)}

# Write ERROR message
# returns 0 on success
# echoes ERROR message
logerror () {
    __logLvl=ERROR
    _log "$@" || return 0
}

# Write INFO message
# returns 0 on success
# echoes INFO message
loginfo () {
    __logLvl=INFO
    _log "$@" || return 0
}

# Write WARN message
# returns 0 on success
# echoes WARN message
logwarn () {
    __logLvl=WARN
    _log "$@" || return 0
}