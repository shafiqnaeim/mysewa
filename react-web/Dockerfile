# Build React app, serve with nginx (proxies /api and /uploads to Spring)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm config set fetch-retries 10 \
  && npm config set fetch-retry-mintimeout 15000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 300000 \
  && sh -c 'for i in 1 2 3 4 5; do echo "npm ci attempt $i"; npm ci && exit 0; sleep 20; done; exit 1'
COPY . .
# Vite bakes VITE_* into the bundle at build time — from compose build-arg and/or react-web/.env.production
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN (test -n "$VITE_GOOGLE_MAPS_API_KEY" || grep -qE '^VITE_GOOGLE_MAPS_API_KEY=.+$' .env.production 2>/dev/null) \
    || (echo "ERROR: Set VITE_GOOGLE_MAPS_API_KEY in repo root .env or react-web/.env.production" >&2 && exit 1)
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
