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

    buildsDir="builds/"
    if is_release_tag; then
        buildsDir=
    fi

    # group all intermediate artifacts for a branch/tag under the same folder
    ARTIFACTORY_TARGET_DIR="${ARTIFACTORY_PROJECT_DIR}/${buildsDir}${SAFE_RELEASE_TAG}"
    loginfo "Artifactory target directory is \"${ARTIFACTORY_TARGET_DIR}\""

    ARTIFACTORY_SRC_PKG=$(get_from_storage "${PUBLISHED_ARTIFACTS_DATA}" "Source Code Build Artifact")
    if is_release_tag; then
        localPkgName=$(basename "${ARTIFACTORY_SRC_PKG}")

        loginfo "Downloading \"${ARTIFACTORY_SRC_PKG}\" from Artifactory and saving it to \"${localPkgName}\""
        artifactory_download "${ARTIFACTORY_SRC_PKG}" "${localPkgName}" || return 1

        newLocalPkgName="${PROJECT_NAME}-${SAFE_RELEASE_TAG}-source.tgz"
        loginfo "Renaming \"${localPkgName}\" to \"${newLocalPkgName}\""
        mv "${localPkgName}" "${newLocalPkgName}" || return 1

        loginfo "Uploading \"${newLocalPkgName}\" to Artifactory"
        ARTIFACTORY_SRC_PKG=$(artifactory_upload "${newLocalPkgName}" "${ARTIFACTORY_TARGET_DIR}") || return 1

    else
        loginfo "Not a release build, re-using existing artifact"
    fi

    ARTIFACTORY_SRC_PKG="$(artifactory_base_url)${ARTIFACTORY_SRC_PKG}"
    save_to_storage "${PUBLISHED_ARTIFACTS_DATA}" "Published Source Code Archive" "${ARTIFACTORY_SRC_PKG}"
    loginfo "The source code uploaded to \"${ARTIFACTORY_SRC_PKG}\""

    ARTIFACTORY_IMG_NAME=$(get_from_storage "${PUBLISHED_ARTIFACTS_DATA}" "Docker Image Build Artifact")
    loginfo "Pulling Docker image \"${ARTIFACTORY_IMG_NAME}\" from Artifactory"
    docker pull "${ARTIFACTORY_IMG_NAME}"

    if is_release_tag; then
        newImageName=$(docker_wrap_img_name "${PROJECT_NAME}:${SAFE_RELEASE_TAG}")

        loginfo "Renaming Docker image \"${ARTIFACTORY_IMG_NAME}\" to \"${newImageName}\""
        docker tag "${ARTIFACTORY_IMG_NAME}" "${newImageName}" || return 1

        loginfo "Pushing image \"${newImageName}\" to the registry"
        docker_login || return 1
        docker push "${newImageName}" || return 1
        ARTIFACTORY_IMG_NAME="${newImageName}"
    else
        loginfo "Not a release build, re-using existing Docker image"
    fi

    save_to_storage "${PUBLISHED_ARTIFACTS_DATA}" "Published Docker Image" "${ARTIFACTORY_IMG_NAME}"
    loginfo "The image published to the registry under the name \"${ARTIFACTORY_IMG_NAME}\""

    fileTag="${SAFE_BUILD_TAG}"
    if is_release_tag; then
        fileTag="${SAFE_RELEASE_TAG}"
    fi

    imageFileName="${PROJECT_NAME}-${fileTag}.tar.gz"

    loginfo "Saving Docker image to the file \"${imageFileName}\""
    docker save "${ARTIFACTORY_IMG_NAME}" | gzip > "${imageFileName}" || return 1

    loginfo "Uploading \"${imageFileName}\" to Artifactory"
    ARTIFACTORY_IMG_PKG=$(artifactory_upload "${imageFileName}" "${ARTIFACTORY_TARGET_DIR}") || return 1

    ARTIFACTORY_IMG_PKG="$(artifactory_base_url)${ARTIFACTORY_IMG_PKG}"
    save_to_storage "${PUBLISHED_ARTIFACTS_DATA}" "Published Docker Image Archive" "${ARTIFACTORY_IMG_PKG}"
    loginfo "The Docker image archive uploaded to \"${ARTIFACTORY_IMG_PKG}\""
}

main "$@"
