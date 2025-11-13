#!/usr/bin/env sh

cibsfile="$(dirname "${0}")/../misc/ci-scripts-lib/bootstrap.sh"
# shellcheck disable=SC1090
BS_FILE="${cibsfile}" . "${cibsfile}" || exit 1
unset cibsfile

main () {
    require_var \
        ACC_CHANGELOG_AUTOMATOR_TOKEN \
        ACC_RELEASE_TAG_TRIGGER \
        CI_API_V4_URL \
        CI_COMMIT_SHA \
        CI_PROJECT_ID \
        CI_PROJECT_URL

    command_exists \
        curl \
        jq \
        release

    release --version || return 1

    # release will print current version number if no changes are found in log
    if ! NEXT_VERSION=$(release next-version);
    then
        echo "No changes found to promote the change to new version. Exiting..."
        exit 0
    fi

    echo "Next version is '${NEXT_VERSION}'"

    # print version only and exit
    if [ -n "${RELEASE_VERSION_ONLY}" ];
    then
        exit 0
    fi

    for pkg in "package.json" "package-lock.json"
    do
        echo "Updating '${pkg}'"
        content=$(jq --indent 2 --arg version "${NEXT_VERSION}" --arg githash "${CI_COMMIT_SHA}" '.version = $version | . + { githash: $githash }' $pkg) || return 1
        echo "$content" > $pkg
    done

    FILES_TO_COMMIT="package.json package-lock.json"
    # - generate changelog for the release branches only
    # - do not commit changelog to feature branch because it requires to be
    #   cleaned up before merging to main
    # - commit package.json and package-lock.json doesn't matter what target branch is
    #   because 'release' branch pipeline will override it in any case with valid version 
    #   right after the merge
    if is_release_branch;
    then
        FILES_TO_COMMIT="${FILES_TO_COMMIT} CHANGELOG.md"
    fi

    # create tag and release
    NEXT_VERSION="v${NEXT_VERSION}"
    echo "Creating tag and release with name ${NEXT_VERSION}"

    release changelog || return 1
    # shellcheck disable=SC2086
    release commit-and-tag --create-tag-pipeline ${FILES_TO_COMMIT} || return 1
    # it creates TAG and RELEASE, for dev builds RELEASES have to be removed, see below

    # do not create `latest` for hotfixes, LTS and etc. only active release branch and dev branches
    LATEST_VERSION=
    if is_release_active_branch;
    then
        # create 'latest' tag for main/active release branch only!
        LATEST_VERSION="latest"
    elif ! is_release_branch;
    then
        # replace build seq number with 'latest'
        LATEST_VERSION="$(echo "${NEXT_VERSION}" | sed 's/-dev\.[0-9][0-9]*+/-dev-latest+/')"
    fi

    if [ -n "${LATEST_VERSION}" ];
    then
        echo "Removing '${LATEST_VERSION}' release"
        curl --fail --request DELETE \
            --header "PRIVATE-TOKEN: ${ACC_CHANGELOG_AUTOMATOR_TOKEN}" \
            "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases/${LATEST_VERSION}" || true

        echo "Removing '${LATEST_VERSION}' tag"
        curl --fail --request DELETE \
            --header "PRIVATE-TOKEN: ${ACC_CHANGELOG_AUTOMATOR_TOKEN}" \
            "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/repository/tags/${LATEST_VERSION}" || true

        if is_release_active_branch;
        then
        echo "Creating '${LATEST_VERSION}' tag and release"
        curl --get --request POST \
            --header "PRIVATE-TOKEN: ${ACC_CHANGELOG_AUTOMATOR_TOKEN}" \
            --data-urlencode "tag_name=${LATEST_VERSION}" \
            --data-urlencode "ref=${NEXT_VERSION}" \
            --data-urlencode "description=See [${NEXT_VERSION}](${CI_PROJECT_URL}/-/tags/${NEXT_VERSION}) for more info" \
            "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases" \
            || return 1
        else
        echo "Creating '${LATEST_VERSION}' tag only"
        curl --get --request POST \
            --header "PRIVATE-TOKEN: ${ACC_CHANGELOG_AUTOMATOR_TOKEN}" \
            --data-urlencode "tag_name=${LATEST_VERSION}" \
            --data-urlencode "ref=${NEXT_VERSION}" \
            --data-urlencode "message=See ${NEXT_VERSION} tag for more info" \
            "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/repository/tags" \
            || return 1
        fi

        echo "Triggering pipeline for '${LATEST_VERSION}' tag"
        curl --get --request POST \
            --header "PRIVATE-TOKEN: ${ACC_CHANGELOG_AUTOMATOR_TOKEN}" \
            --data-urlencode "ref=${LATEST_VERSION}" \
            "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/pipeline" \
            || return 1
    fi

    # Have to remove "dev" releases but keep tags
    if ! is_release_branch;
    then
        echo "Removing '${NEXT_VERSION}' release"
        curl --fail --request DELETE \
            --header "PRIVATE-TOKEN: ${ACC_CHANGELOG_AUTOMATOR_TOKEN}" \
            "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases/${NEXT_VERSION}" || true
    fi
}

main "$@"
