#!/usr/bin/env sh

setifndef "__ARTIFACTORY_UTIL_DEFINED" || return 0

# check env vars first
require_var \
    ATG_ARTIFACTORY_DOCKER_TOKEN \
    ATG_ARTIFACTORY_GENERIC_REPO \
    ATG_ARTIFACTORY_PUBLISH_URL

# returns 0 on success
# echoes Artifactory base URL for the project
artifactory_base_url () {
    echo "https://${ATG_ARTIFACTORY_PUBLISH_URL}/artifactory/${ATG_ARTIFACTORY_GENERIC_REPO}/"
}

# Download file from Artifactory
# $1 - remote directory (path)
# $2 - path to file to save dowlonaded data to
# returns 0 on success
# echoes local path to the file
artifactory_download () {(
    # shellcheck disable=SC2046
    if ! output=$(curl --fail --retry 3 -H "Authorization: Bearer ${ATG_ARTIFACTORY_DOCKER_TOKEN}" -o "${2}" "$(artifactory_base_url)${1}") ; then
        logerror "Unable to download artifact \"${1}\" from Artifactory and save it to \"${2}\". Error: ${output}"
        return 1
    fi

    echo "${2}"
    return 0
)}

# Upload file to Artifactory
# $1 - path to file to upload
# $2 - remote directory (path)
# returns 0 on success
# echoes remote path to the file
artifactory_upload () {(
    remotePath="${2}/$(basicUrlEncode "$(basename "${1}")")"
    # shellcheck disable=SC2046
    if ! output=$(curl --fail --retry 3 -H "Authorization: Bearer ${ATG_ARTIFACTORY_DOCKER_TOKEN}" -T "${1}" "$(artifactory_base_url)${remotePath}") ; then
        logerror "Unable to upload artifact \"${1}\" to Artifactory. Error: ${output}"
        return 1
    fi

    echo "${remotePath}"
    return 0
)}