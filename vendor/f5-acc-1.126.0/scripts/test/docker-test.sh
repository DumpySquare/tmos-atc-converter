#!/usr/bin/env sh

MAIN_SCRIPT="${0}"
cibsfile="$(dirname "${MAIN_SCRIPT}")/../misc/ci-scripts-lib/bootstrap.sh"
# shellcheck disable=SC1090
BS_FILE="${cibsfile}" . "${cibsfile}" || exit 1
unset cibsfile

main () {
    ARTIFACTORY_IMG_NAME=$(get_from_storage "${PUBLISHED_ARTIFACTS_DATA}" "Docker Image Build Artifact")
    loginfo "Using Docker image \"${ARTIFACTORY_IMG_NAME}\" for tests"

    # as3 ucs convertion
    docker run -v "${PROJECT_DIR}/test:/app/test/" "${ARTIFACTORY_IMG_NAME}" -u test/basic_install.ucs -o test/output1.json -d
    # as3 conf convertion
    docker run -v "${PROJECT_DIR}/test:/app/test" "${ARTIFACTORY_IMG_NAME}" -c test/main/main.conf -o test/output2.json
    # DO ucs convertion
    docker run -v "${PROJECT_DIR}/test:/app/test" "${ARTIFACTORY_IMG_NAME}" -u test/basic_install.ucs -o test/output3.json --declarative-onboarding
    # DO conf convertion
    docker run -v "${PROJECT_DIR}/test:/app/test" "${ARTIFACTORY_IMG_NAME}" -c test/main/main.conf -o test/output4.json --declarative-onboarding -d

    # verify output file has contents
    ls -la test/
    ACC_WC=$( wc -l < test/output1.json )
    DO_WC=$( wc -l < test/output3.json )

    if [ "${DO_WC}" -eq 0 ] ; then return 1; fi;
    if [ "${ACC_WC}" -eq 0 ] ; then return 1; fi;
}

main "$@"
