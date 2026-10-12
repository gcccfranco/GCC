FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Outillages système supplémentaires pour le dev si nécessaire
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends postgresql-client \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Définir l'utilisateur par défaut
USER node