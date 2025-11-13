#!/usr/bin/env sh
#shellcheck disable=SC2034

setifndef "__CI_BOOTSTRAP_VARS" || return 0

__DIST_DIR__=./dist
__DEFAULT_STORAGE__="${__DIST_DIR__}/storage.txt"

IMAGE_BUILD_DATA="${__DIST_DIR__}/docker-build.txt"
PUBLISHED_ARTIFACTS_DATA="${__DIST_DIR__}/published-artifacts.txt"

PROJECT_DIR="${CI_PROJECT_DIR:-$(pwd)}"
PROJECT_NAME="${CI_PROJECT_NAME:-$(basename "${PROJECT_DIR}")}"

ARTIFACTORY_PROJECT_DIR="${PROJECT_NAME}"

# use for tagging images, archives and etc. for release builds
RELEASE_TAG="${CI_COMMIT_TAG:-${CI_COMMIT_REF_NAME:-dev-env}}"
SAFE_RELEASE_TAG=$(basicUrlEncode "${RELEASE_TAG}")

# use for tagging images, archives and etc. for dev builds
BUILD_TAG="${RELEASE_TAG}-${CI_COMMIT_SHORT_SHA}${CI_COMMIT_SHORT_SHA:+-}$(date +%Y%m%d%H%M%S)"
SAFE_BUILD_TAG=$(basicUrlEncode "${BUILD_TAG}")

##################################
# RELEASE RELATED VARIABLES
#
# release version will look like:
# - vX.Y.Z
# - latest
# dev version look will look like
# - X.Y.Z-dev.A+brach-name
# - # - X.Y.Z-dev.B+brach-name-latest
# In case of a code freeze:
# - branch from vX.Y.0 to vX.Y.x-CODENAME branch (e.g., `v1.3.x-mango`) and switch there
# - move all commit types from GSG_MINOR_COMMIT_TYPES to GSG_PATCH_COMMIT_TYPES
# - change from main to vX.Y.x-CODENAME in GSG_RELEASE_BRANCHES
##################################
# template for dev builds - as result `release` produce 'vX.Y.Z-dev.A+branch-name'
export GSG_BUILD_TMPL='{{ (env "CI_COMMIT_REF_SLUG") }}'
# minor version bump for features only
export GSG_MINOR_COMMIT_TYPES="${RELEASE_MINOR_COMMIT_TYPES:-feat,fix,refactor,perf}"
# patch version bump for fixes, refactor and perf improvements
export GSG_PATCH_COMMIT_TYPES="${RELEASE_PATCH_COMMIT_TYPES:-}"
# template for dev builds - as result `release` produce 'vX.Y.Z-dev.A+branch-name'
export GSG_PRE_TMPL="dev,{{ seq }}"
# release branches (comma separated) - running `release` on release branches
# will produce 'release' version (vX.Y.Z) and not 'dev' version
export GSG_RELEASE_BRANCHES="${RELEASE_BRANCHES:-main}"
# GitLab Access token
export GL_TOKEN="${RELEASE_TOKEN:-${ACC_CHANGELOG_AUTOMATOR_TOKEN}}"
# main/active release branch - e.g. we have 'main' for current main development (v2.0.0)
# and v1.5.0 for LTS. In this case 'main' is the branch that produce 'latest' builds
export RELEASE_ACTIVE_BRANCH="${RELEASE_ACTIVE_BRANCH:-main}"
# print only next version and exit - for debug purpose only
export RELEASE_VERSION_ONLY="${RELEASE_VERSION_ONLY}"


