FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.1.4 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages packages
COPY apps apps

RUN pnpm install --frozen-lockfile
RUN pnpm run build

CMD ["pnpm", "--filter", "example-indexer", "start"]
