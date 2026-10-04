# Volty as one container. Everything the app keeps (SQLite database, devnet keys, voice models) lives
# in /app/data, which points at a persistent volume mounted on /data.
FROM node:24-bookworm-slim AS build
WORKDIR /app
# better-sqlite3 compiles its native binding when no prebuilt one fits.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The build needs a database to open; an empty one is enough, the real one is on the volume.
RUN mkdir -p data && DATABASE_PATH=/tmp/build.db npx drizzle-kit push --force && DATABASE_PATH=/tmp/build.db npm run build

FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# Dev dependencies stay, so the scripts (npm run sim, setup:devnet…) also run on the server.
COPY --from=build /app /app
RUN rm -rf /app/data && ln -s /data /app/data && chmod +x /app/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npx", "next", "start"]
