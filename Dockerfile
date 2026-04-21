FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Build stage
FROM base AS build
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile
COPY src ./src

# Final image
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY package.json .

EXPOSE 3000

USER bun
CMD ["bun", "run", "src/index.ts"]
