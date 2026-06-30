FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate

WORKDIR /app

# Copy root configurations and lockfiles
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy all packages and apps (since it's a monorepo, we need the workspace for local linked packages)
COPY packages packages
COPY apps apps

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build everything
RUN pnpm run build

EXPOSE 3000

# Start command is defined in docker-compose, but we can provide a default
CMD ["pnpm", "--filter", "demo-api", "start"]
