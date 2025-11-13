# syntax = docker/dockerfile:1.3
ARG ATG_ARTIFACTORY_DOCKER_REPO
ARG ATG_ARTIFACTORY_PUBLISH_URL
FROM ${ATG_ARTIFACTORY_PUBLISH_URL}/${ATG_ARTIFACTORY_DOCKER_REPO}/f5-acc-base-image:v1.9

ARG NPM_PKG_PATH
ARG TEEM_CONTEXT

ENV DOCKER_CONTAINER true
ENV TEEM_API_ENVIRONMENT $TEEM_CONTEXT

WORKDIR /app

COPY --chown=f5docker:f5docker package-lock.json .
COPY --chown=f5docker:f5docker "${NPM_PKG_PATH}" .

SHELL ["/bin/bash", "-c"]
# Run as many commands as possible as part of a single RUN command
# because it produce 1 layer only as result of execution.
# Less Dockerfile commands (like RUN, CMD and etc.) -> less layers
# Less layers -> less security warnings
RUN --mount=type=secret,id=TEEM_KEY cp /run/secrets/TEEM_KEY . \
    && echo "NODE.JS version - $(node --version)" \
    && tar -xvf "$(basename "${NPM_PKG_PATH}")" && mv package/* . \
    && rm "$(basename "${NPM_PKG_PATH}")" \
    && npm ci --omit=dev \
    && chown -R f5docker:f5docker . \
    && ls -als \
##
# Lookout issues resolver
##
    && npm uninstall npm -g \
    && rm -rf /usr/local/bin/npm ~/.npm /usr/local/include/node /usr/local/lib/node_modules \
    && find /app/node_modules -name "*.c" -exec rm -rf {} \; \
    && find /app/node_modules -name "Dockerfile" -exec rm -f {} \; \
    && find /app/node_modules -name "*.md" ! -iname "license*" -exec rm -f {} \; \
    && find /app/node_modules -type d -wholename "*/node_modules/**/test" ! -wholename "*/@automation-toolchain/*" -prune -exec rm -rf {} \;

USER f5docker
ENTRYPOINT [ "/usr/local/bin/node", "init.js" ]
