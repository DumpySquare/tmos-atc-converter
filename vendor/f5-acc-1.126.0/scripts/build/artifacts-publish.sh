#!/usr/bin/env sh

MAIN_SCRIPT="${0}"
cibsfile="$(dirname "${MAIN_SCRIPT}")/../misc/ci-scripts-lib/bootstrap.sh"
# shellcheck disable=SC1090
BS_FILE="${cibsfile}" . "${cibsfile}" || exit 1
unset cibsfile

main () {
    require "$(dirname "${MAIN_SCRIPT}")/../misc/ci-scripts-lib/artifactory.sh" \
        && require "$(dirname "${MAIN_SCRIPT}")/../misc/ci-scripts-lib/docker.sh" \
        || return 1

    NPM_PKG_PATH=$(get_from_storage "${IMAGE_BUILD_DATA}" NPM_PKG_PATH)
    # group all intermediate artifacts for a branch/tag under the same folder
    ARTIFACTORY_TARGET_DIR="${ARTIFACTORY_PROJECT_DIR}/builds/${SAFE_RELEASE_TAG}"

    loginfo "Artifactory target directory is \"${ARTIFACTORY_TARGET_DIR}\""

    loginfo "Uploading NPM package \"${NPM_PKG_PATH}\" with the source code to Artifactory \"${ARTIFACTORY_TARGET_DIR}\""
    ARTIFACTORY_SRC_PKG=$(artifactory_upload "${NPM_PKG_PATH}" "${ARTIFACTORY_TARGET_DIR}") || return 1

    save_to_storage "${PUBLISHED_ARTIFACTS_DATA}" "Source Code Build Artifact" "${ARTIFACTORY_SRC_PKG}"
    loginfo "The source code uploaded to \"$(artifactory_base_url)${ARTIFACTORY_SRC_PKG}\""

    DOCKER_BUILD_IMG_FULL=$(get_from_storage "${IMAGE_BUILD_DATA}" DOCKER_BUILD_IMG_FULL)
    DOCKER_BUILD_IMG_NAME=$(get_from_storage "${IMAGE_BUILD_DATA}" DOCKER_BUILD_IMG_NAME)
    DOCKER_BUILD_IMG_TAG=$(get_from_storage "${IMAGE_BUILD_DATA}" DOCKER_BUILD_IMG_TAG)
    loginfo "Preparing Docker image \"${DOCKER_BUILD_IMG_FULL}\" to be uploaded to Artifactory Docker Hub"

    ARTIFACTORY_IMG_FULL=$(docker_wrap_img_name "${DOCKER_BUILD_IMG_FULL}")
    ARTIFACTORY_IMG_NAME=$(docker_wrap_img_name "${DOCKER_BUILD_IMG_NAME}")
    docker tag "${DOCKER_BUILD_IMG_FULL}" "${ARTIFACTORY_IMG_FULL}" || return 1

    loginfo "Docker image renamed to \"${ARTIFACTORY_IMG_FULL}\""
    loginfo "Pushing Docker image \"${ARTIFACTORY_IMG_FULL}\" to Artifactory Docker Hub"

    docker_login || return 1
    docker push "${ARTIFACTORY_IMG_FULL}" || return 1
    save_to_storage "${PUBLISHED_ARTIFACTS_DATA}" "Docker Image Build Artifact" "${ARTIFACTORY_IMG_FULL}"
    save_to_storage "${PUBLISHED_ARTIFACTS_DATA}" "Docker Image Name Build Artifact" "${ARTIFACTORY_IMG_NAME}"
    save_to_storage "${PUBLISHED_ARTIFACTS_DATA}" "Docker Image Tag Build Artifact" "${DOCKER_BUILD_IMG_TAG}"

    loginfo "Docker image pushed to \"${ARTIFACTORY_IMG_FULL}\""
}

main "$@"
