#!/usr/bin/env sh

cibsfile="$(dirname "${0}")/../misc/ci-scripts-lib/bootstrap.sh"
# shellcheck disable=SC1090
BS_FILE="${cibsfile}" . "${cibsfile}" || exit 1
unset cibsfile

main () {
    require_var \
        ACC_CHANGELOG_AUTOMATOR_TOKEN \
        CI_API_V4_URL \
        CI_PROJECT_ID

    if ! is_release_tag || is_release_latest_tag; then
        echo "Not applicable to tags other than vX.Y.Z. Exiting..."
    fi

    # Create GitLab Release' Link using storage info
    # - $1 - storage name
    # - $2 - key
    # - returns 0 on success
    create_release_link_using_storage_data () {(
        value=$(get_from_storage "${1}" "${2}")

        # use SAFE_RELEASE_TAG because it is an actual GitLab tag
        curl --get --request POST \
            --header "PRIVATE-TOKEN: ${ACC_CHANGELOG_AUTOMATOR_TOKEN}" \
            --data-urlencode "name=${2}" \
            --data "url=${value}" \
            "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases/${SAFE_RELEASE_TAG}/assets/links"
    )}

    create_release_link_using_storage_data "${PUBLISHED_ARTIFACTS_DATA}" "Published Source Code Archive"
    create_release_link_using_storage_data "${PUBLISHED_ARTIFACTS_DATA}" "Published Docker Image Archive"
}

main "$@"
