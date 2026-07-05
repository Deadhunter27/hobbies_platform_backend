# =============================================================================
# Hobbies Platform Backend — multi-stage production image (ADR-0006)
# The SAME image is promoted through environments; only env vars differ.
# =============================================================================

# ---- Base: pinned Node LTS on slim Debian ----
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

# ---- Dependencies (cached layer) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS build
COPY . .
# prisma generate will be added here once schema.prisma exists (Phase 2)
RUN pnpm build

# ---- Production dependencies only ----
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---- Runtime: slim, non-root ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER app
EXPOSE 3000
# Role flag per ADR-0013: api | worker | all (default api)
CMD ["node", "dist/main.js"]
