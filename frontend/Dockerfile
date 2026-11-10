# ---- build: pnpm install + vite build ----
FROM node:22-alpine AS build
WORKDIR /app

# package.json er packageManager field theke thik eki pnpm version nibe, prompt chara
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Age sudhu package.json ar lock file, tai code bodlale install layer cache theke asbe
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- test: `docker compose --profile test run --rm frontend-tests` (test script porer commit e) ----
FROM build AS test
CMD ["pnpm", "test"]

# ---- final: sudhu static file, nginx diye serve ----
FROM nginx:alpine AS final

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# nginx image start er somoy /docker-entrypoint.d/ er sob script chalay,
# tai ekhane config.js likhe dei (API_URL env theke)
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80
