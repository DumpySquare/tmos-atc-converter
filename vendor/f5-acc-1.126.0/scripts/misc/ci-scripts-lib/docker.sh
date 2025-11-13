#!/usr/bin/env sh

setifndef "__DOCKER_UTIL_DEFINED" || return 0

# check env vars first
require_var \
    ATG_ARTIFACTORY_BASE_URL \
    ATG_ARTIFACTORY_DOCKER_REPO \
    ATG_ARTIFACTORY_DOCKER_TOKEN \
    ATG_ARTIFACTORY_DOCKER_USER

# Login to F5 Artifactory
# returns 0 on success
docker_login () {
    echo "${ATG_ARTIFACTORY_DOCKER_TOKEN}" | docker login -u="${ATG_ARTIFACTORY_DOCKER_USER}" "${ATG_ARTIFACTORY_BASE_URL}" --password-stdin
}

# Wrap image name with F5 Artifactory URL
# $1 - image name
# returns 0 on success
# echoes wrapped image name
docker_wrap_img_name () {
    echo "${ATG_ARTIFACTORY_BASE_URL}/${ATG_ARTIFACTORY_DOCKER_REPO}/${1}"
}
