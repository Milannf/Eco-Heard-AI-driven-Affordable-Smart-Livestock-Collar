FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY agritrack/package.json agritrack/package-lock.json ./
RUN npm ci
COPY agritrack/ ./
ENV CI=1 EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_API_MODE=same-origin
RUN npx expo export --platform web

FROM nginx:1.28-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
