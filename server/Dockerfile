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

# ── IMAGE-STANDALONE-1: THE BUILD CONTEXT IS THE REPOSITORY ROOT ────────────────────────────────
#
# It used to be `./server`, which made `shared/` — one directory up — unreachable by any COPY, so the
# container could only run with a bind mount supplying it. A recipient of this image has no such
# mount, so the image was not something anyone else could run. The context moved so that one file
# could be copied; every path below is therefore repo-relative rather than server-relative.
#
# WHAT IS SENT is decided by the ROOT `.dockerignore`, which is an allow-list. Read it before adding
# a COPY here: a path not re-included there does not exist as far as this file is concerned, and the
# build will fail on it loudly. That is deliberate.
COPY server/package.json ./
RUN npm install --omit=dev  && apk del .build-deps

COPY server/src/ ./src/
# COPY-UTILS-1: `utils/` was only ever supplied by a bind mount, which meant the image could not run
# without the repository beside it. Copied since 2026-09-01.
COPY server/utils/ ./utils/
# `server/data/` is NOT copied, deliberately — see the root `.dockerignore`. The runtime store holds
# this install's accounts, and every directory the server needs there is created at runtime anyway.
COPY server/seeds/ ./seeds/

# THE ONE FILE FROM OUTSIDE `server/`, and the reason the context moved.
# `server/src/routes/playerGroups.js` imports `../../../shared/nameLimits.mjs`, which from
# `/app/src/routes/` resolves to `/shared/` — outside WORKDIR, which is why the destination is an
# absolute path rather than something under /app. Established by resolving all 65 relative specifiers
# in `server/src` and `server/utils`; this is the entire list.
COPY shared/nameLimits.mjs /shared/nameLimits.mjs

# SERVE-SPA-1 — THE BUILT CLIENT, FROM A NAMED BUILD CONTEXT.
#
# The client build arrives through a NAMED BUILD CONTEXT, and still should even now that the primary
# context is the repository root (IMAGE-STANDALONE-1 moved it). `client/dist` is a BUILD ARTEFACT
# rather than source, and the root `.dockerignore` is an allow-list of source; naming it separately
# keeps it an explicit input rather than something that must happen to be lying in the tree.
# `docker compose build` supplies it (see `additional_contexts` in docker-compose.yml); a manual
# build needs `--build-context client=./client`.
#
# IT COPIES A BUILD, IT DOES NOT MAKE ONE: `client/dist` must exist first (`npm run build` in
# client/). Building the client inside this image would make it self-contained at the cost of an
# npm install of the whole front end on every image build; that trade is written up as a proposal
# rather than taken here.
#
# The server finds it through RA_CLIENT_DIST, which this image declares for itself below.
COPY --from=client dist/ ./client-dist/

# IMAGE-STANDALONE-1: the image DECLARES where its own client build is, so `docker run` with no
# extra configuration serves the app. The default in `staticClient.js` is `../../client/dist`
# resolved from the server's module — correct in a checkout, wrong in this image, where the build
# lands at /app/client-dist. Setting it here rather than in docker-compose.yml keeps ONE home for
# the fact: the image knows its own layout, and a recipient who never reads our compose file still
# gets a working app.
ENV RA_CLIENT_DIST=/app/client-dist

# ── CONTAINER-NONROOT-1: THE IMAGE DOES NOT RUN AS ROOT ─────────────────────────────────────────
#
# This repository is public and licensed, so `docker run` on it is something a stranger does. With
# no USER directive that stranger gets a root process by default, and anything that can write or
# escape from it starts at uid 0. Nothing here needs root after the build.
#
# `node` is the unprivileged user the official node images already ship (uid 1000). Using it rather
# than creating one keeps this to two lines and avoids a second answer to a question the base image
# has already answered.
#
# WHAT IT MUST OWN, established by resolving every write site rather than by guessing: writeFileSync,
# mkdirSync, renameSync, copyFileSync, appendFileSync and unlinkSync appear in ten modules across
# `server/src` and `server/utils`, and EVERY target resolves under DATA_ROOT — /app/data. Nothing
# writes to /app itself, to /shared, to ./client-dist or to /tmp. Exactly one directory changes
# hands. `node_modules` stays root-owned and world-readable, which is what a dependency tree should
# be: the process can read it and cannot rewrite it.
#
# CREATING THE DIRECTORY HERE IS THE LOAD-BEARING HALF, and leaving it out breaks a fresh install.
# `/app/data` is deliberately NOT copied — the root .dockerignore excludes `server/data/**` so an
# operator's accounts never enter a layer — so on a fresh install the server MKDIRS it at boot, and
# uid 1000 cannot mkdir inside a root-owned /app. MEASURED by removing exactly this line and running
# the result on an empty named volume: the container EXITS 1 with
# `EACCES: permission denied, mkdir '/app/data/tracks'`, on the seed delivery, which is the first
# write a new install makes. So the failure is LOUD rather than a half-seeded install — but it is
# total, and it is the whole install. A Docker named volume mounted here inherits this ownership; a
# bind mount brings its own, which is why the compose path is proved separately.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 4000

CMD ["node", "src/index.js"]
