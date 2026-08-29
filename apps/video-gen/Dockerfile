# Multi-stage Dockerfile for Video Studio UI (apps/video-gen)

# Stage 1: Build static assets using Node.js & pnpm
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root monorepo files needed for pnpm workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/video-gen/package.json ./apps/video-gen/

# Install dependencies
RUN pnpm install --filter video-gen...

# Copy source files
COPY apps/video-gen ./apps/video-gen

# Build production bundle
RUN pnpm --filter video-gen build

# Stage 2: Serve using lightweight Nginx
FROM nginx:alpine

COPY --from=builder /app/apps/video-gen/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
