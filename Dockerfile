# Multi-stage build — the runtime image only needs production deps + the
# built output (dist/), not Vite/TypeScript/esbuild themselves.

FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# vite build (client) + esbuild bundle of server.ts -> dist/server.cjs
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# esbuild bundled server.ts with --packages=external, so runtime deps still
# need to resolve for real out of node_modules — only production ones.
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
