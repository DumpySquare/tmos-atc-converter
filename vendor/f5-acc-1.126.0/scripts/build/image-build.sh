#!/usr/bin/env sh

cibsfile="$(dirname "${0}")/../misc/ci-scripts-lib/bootstrap.sh"
# shellcheck disable=SC1090
BS_FILE="${cibsfile}" . "${cibsfile}" || exit 1
unset cibsfile

main () {(
    loginfo "Creating ACC NPM package"

    NPM_PKG_PATH="${PROJECT_NAME}-${SAFE_BUILD_TAG}-source.tgz"
    PKG_TARBALL=$(npm pack) || return 1

    mv "${PKG_TARBALL}" "${NPM_PKG_PATH}" || return 1
    ls -ahls "${NPM_PKG_PATH}"

    loginfo "ACC NPM package \"${NPM_PKG_PATH}\" created"

    # Use commit tag to set image tag and TEEM key
    if is_release_tag; then
        TEEM_KEY="${TEEM_KEY_PROD:?is required for tagged builds!}"
        loginfo "Using TEEM key: TEEM_KEY_PROD (masked)."
        TEEM_CONTEXT="production"
    else
        TEEM_KEY="${TEEM_KEY_DEV:?is required for untagged builds!}"
        loginfo "Using TEEM key: TEEM_KEY_DEV (masked)."
        TEEM_CONTEXT="staging"
    fi

    # Build image.
    export TEEM_KEY
    DOCKER_BUILD_IMAGE_FULL_NAME_SAFE="${PROJECT_NAME}:${SAFE_BUILD_TAG}"

    docker build \
        --progress=plain \
        --no-cache \
        --secret id=TEEM_KEY \
        --build-arg ATG_ARTIFACTORY_DOCKER_REPO="${ATG_ARTIFACTORY_DOCKER_REPO}" \
        --build-arg ATG_ARTIFACTORY_PUBLISH_URL="${ATG_ARTIFACTORY_PUBLISH_URL}" \
        --build-arg NPM_PKG_PATH="${NPM_PKG_PATH}" \
        --build-arg TEEM_CONTEXT="${TEEM_CONTEXT}" \
        -t "${DOCKER_BUILD_IMAGE_FULL_NAME_SAFE}-raw" . \
    || return 1

    loginfo "Squashing Docker image by removing intermediate layers that may contain sensitive information"

    docker-squash -t "${DOCKER_BUILD_IMAGE_FULL_NAME_SAFE}" "${DOCKER_BUILD_IMAGE_FULL_NAME_SAFE}-raw" || return 1
    docker image ls "${DOCKER_BUILD_IMAGE_FULL_NAME_SAFE}" || return 1
    docker history "${DOCKER_BUILD_IMAGE_FULL_NAME_SAFE}" || return 1

    loginfo "Docker image was built, squashed and saved to local registry (visible to runner only) by name \"${DOCKER_BUILD_IMAGE_FULL_NAME_SAFE}\""

    save_to_storage "${IMAGE_BUILD_DATA}" DOCKER_BUILD_IMG_FULL "${DOCKER_BUILD_IMAGE_FULL_NAME_SAFE}"
    save_to_storage "${IMAGE_BUILD_DATA}" DOCKER_BUILD_IMG_NAME "${PROJECT_NAME}"
    save_to_storage "${IMAGE_BUILD_DATA}" DOCKER_BUILD_IMG_TAG "${SAFE_BUILD_TAG}"
    save_to_storage "${IMAGE_BUILD_DATA}" NPM_PKG_PATH "${NPM_PKG_PATH}"
)}

main "$@"
