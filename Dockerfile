# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build

RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.15.4

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --filter @spt/api...

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @spt/api prisma:generate
RUN pnpm --filter @spt/api... build
RUN pnpm --filter @spt/api --prod deploy /prod/api
# deploy creates fresh node_modules — regenerate client into the production bundle
COPY apps/api/prisma /prod/api/prisma
RUN pnpm --filter @spt/api exec prisma generate --schema=/prod/api/prisma/schema.prisma

FROM node:20-bookworm-slim AS production

RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /prod/api ./

ENV NODE_ENV=production

CMD ["node", "dist/apps/api/src/main.js"]
