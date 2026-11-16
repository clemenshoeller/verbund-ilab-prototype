# Build stage
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Settings are read at build time (see .env.example). Pass them with --build-arg, for example
#   docker build --build-arg VITE_DATA_SOURCE=api --build-arg VITE_API_BASE_URL=https://example.internal/api .
ARG VITE_DATA_SOURCE=mock
ARG VITE_API_BASE_URL=
ENV VITE_DATA_SOURCE=$VITE_DATA_SOURCE VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Runtime stage: static files on an nginx that runs without root (works on OpenShift,
# which starts containers under an arbitrary non-root user) and listens on port 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
