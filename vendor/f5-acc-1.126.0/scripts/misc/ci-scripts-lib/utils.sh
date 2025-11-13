#!/usr/bin/env sh

setifndef "__MISC_UTILS_DEFINED" || return 0

##########
#
# - Use sub-shell if you want local variables
#
##########

# Do basic URL encode
# - data to encode
# - echoes encoded data
basicUrlEncode () {(
    echo "$1" | sed 's/[^0-9a-zA-Z\/:_\.\-]/-/g'
)}

# Checks if command(s) exist
# - accepts multiple arguments
# - returns 1 when command(s) not exist
command_exists () {(
    retcode=0
    for v in "$@"
    do
        if ! [ -x "$(command -v "$v")" ];
        then
            logerror "Command '${v}' is required!"
          retcode=1
        fi
    done
    return "$retcode"
)}

# Create 'dist' dir
# - echoes path to directory
create_dist_dir () {(
    mkdir -p "${__DIST_DIR__}"
    echo "${__DIST_DIR__}"
)}

# Delete data from the storage
# - $1 - key or data storage name
# - $2 - key (2 arguments only)
delete_from_storage () {(
    key=$1
    storage=$__DEFAULT_STORAGE__
    if test "$#" -gt 1; then
        key=$2
        storage=$1
    fi
    if exists_in_storage "${storage}" "${key}"; then
        sed -i '' "/^${key}=/d" "${storage}"
    fi
)}

# Check a key exists in the storage
# - $1 - key or data storage name
# - $2 - key (2 arguments only)
# - returns 0 if exists
exists_in_storage () {(
    key=$1
    storage=$__DEFAULT_STORAGE__
    if test "$#" -gt 1; then
        key=$2
        storage=$1
    fi
    [ -f "${storage}" ] && grep "^${key}=" "${storage}" > /dev/null 2>&1
)}

# Get data from the storage
# - $1 - key or data storage name
# - $2 - key (2 arguments only)
# - returns 0 if exists
# - echoes value if exists
get_from_storage () {(
    key=$1
    storage=$__DEFAULT_STORAGE__

    if test "$#" -gt 1; then
        key=$2
        storage=$1
    fi

    if exists_in_storage "${storage}" "${key}"; then
        sedOutput=$(sed -n "s/^${key}=//p" "${storage}")
        echo "${sedOutput}"
        return 0
    fi
    return 1;
)}

# App version from package.json
# - echoes package version
get_pkg_version () {(
    node -p -e "require('./package.json').version"
)}

# Check if branch is the main branch
# - returns 0 if branch is the main branch
is_release_active_branch() {
    [ "${CI_COMMIT_BRANCH}" = "${RELEASE_ACTIVE_BRANCH}" ]
}

# Check if current branch is the release branch
# - returns 0 if branch is the release branch
is_release_branch() {(
    for v in $(echo "${GSG_RELEASE_BRANCHES}" | sed 's/,/ /g')
    do
        if [ "${CI_COMMIT_BRANCH}" = "${v}" ];
        then
            exit 0
        fi
    done
    exit 1
)}

# Check if it is the release build (vX.Y.Z or latest)
# ONLY tag can be a release
# - returns 0 if build is the release build
is_release_tag () {(
    expr "${CI_COMMIT_TAG}" : '^\(v[0-9]\+\.[0-9]\+\.[0-9]\+\|latest\)$'
)}

# Check if it is the release 'latest' tag
# - returns 0 if build is the release 'latest' tag
is_release_latest_tag () {
    test "${CI_COMMIT_TAG}" = "latest"
} 

# Check if variable(s) set
# - accepts multiple arguments
# - returns 1 when variable(s) is not set
require_var () {(
    retcode=0
    for v in "$@"
    do
        if eval test -z '$'"$v";
        then
            logerror "Variable '${v}' is required!"
            retcode=1
        fi
    done
    return "$retcode"
)}

# Save data to the storage
# - $1 - key or data storage name
# - $2 - val to save or key (3 args only)
# - $3 - val (3 args only)
save_to_storage () {(
    key=$1
    val=$2
    storage=$__DEFAULT_STORAGE__
    if test "$#" -gt 2; then
        val=$3
        key=$2
        storage=$1
    fi
    delete_from_storage "${storage}" "${key}"
    echo "${key}=${val}" >> "${storage}"
)}
