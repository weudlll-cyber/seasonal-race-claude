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

# SERVE-SPA-1 — THE BUILT CLIENT, FROM A NAMED BUILD CONTEXT.
#
# The build context of this image is `./server`, and the client build lives at `./client/dist`,
# OUTSIDE it — so an ordinary COPY cannot reach it. The alternative that suggests itself is moving
# the context up to the repository root, which is a structural decision this image should not make
# as a side effect; a NAMED BUILD CONTEXT gets the directory in while leaving the context where it
# is. `docker compose build` supplies it (see `additional_contexts` in docker-compose.yml), and a
# manual build needs `--build-context client=./client`.
#
# IT COPIES A BUILD, IT DOES NOT MAKE ONE: `client/dist` must exist first (`npm run build` in
# client/). Building the client inside this image would make it self-contained at the cost of an
# npm install of the whole front end on every image build; that trade is written up as a proposal
# rather than taken here.
#
# The server finds it through RA_CLIENT_DIST, which docker-compose.yml sets to this path.
COPY --from=client dist/ ./client-dist/

EXPOSE 4000

CMD ["node", "src/index.js"]
