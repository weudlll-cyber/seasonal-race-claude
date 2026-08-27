FROM node:20-alpine

WORKDIR /app

# NATIVE MODULES NEED A TOOLCHAIN ON ALPINE, and without it this image cannot be built at all.
# `better-sqlite3` and `bcrypt` ship prebuilt binaries for glibc, not for musl — `prebuild-install`
# finds nothing for `libc=musl` and falls through to `node-gyp rebuild`, which then fails on "find
# Python". The image in this project's local registry was last built 2026-06-03; the auth work that
# added those two dependencies landed after it, so every build since has failed and nobody noticed
# because the running server was started outside Docker.
#
# `--virtual` so the toolchain is removed in the same layer it was added: it is needed to COMPILE the
# modules and never to run them, and keeping it would put a C compiler in a shipped image for nothing.
RUN apk add --no-cache --virtual .build-deps python3 make g++

COPY package.json ./
RUN npm install --omit=dev  && apk del .build-deps

COPY src/ ./src/
COPY data/ ./data/
COPY seeds/ ./seeds/

EXPOSE 4000

CMD ["node", "src/index.js"]
