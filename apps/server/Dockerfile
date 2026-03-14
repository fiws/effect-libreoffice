FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build

FROM base AS runner
WORKDIR /app
COPY --from=dependencies /app/ .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "apps/server/src/server.ts"]