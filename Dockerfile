# --- Stage 1 : Dépendances ---
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2 : Build ---
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Stage 3 : Runner (Production) ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Sécurité : utilisateur non-root
ARG USER_UID=1000
ARG USER_GID=1000

# Copie des fichiers statiques et du build autonome
COPY --from=builder /app/public ./public
COPY --from=builder --chown=${USER_UID}:${USER_GID} /app/.next/standalone ./
COPY --from=builder --chown=${USER_UID}:${USER_GID} /app/.next/static ./.next/static

USER ${USER_UID}:${USER_GID}

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]