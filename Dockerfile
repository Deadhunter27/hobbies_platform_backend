# =============================================================================
# Hobbies Platform Backend — multi-stage production image (ADR-0006)
# The SAME image is promoted through environments; only env vars differ.
# =============================================================================

# ---- Base: pinned Node LTS on slim Debian ----
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
# Prisma engines need OpenSSL at build (generate) and runtime (query engine).
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Dependencies (cached layer) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build

# ---- Production dependencies only ----
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml* ./
# prisma/ must be present before install: @prisma/client's postinstall runs
# `prisma generate` (the CLI is a production dependency — it is also needed
# at release time for `prisma migrate deploy`, ADR-0004).
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---- Runtime: slim, non-root ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production
# Compiled dist/ mirrors src/, so tsconfig-paths resolves @modules/@shared/
# @infra/@config aliases against dist at runtime (tsconfig.json baseUrl=./src).
ENV TS_NODE_BASEURL=./dist
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY package.json tsconfig.json ./
USER app
EXPOSE 3000
# Role flag per ADR-0013: api | worker | all (default api)
CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]
