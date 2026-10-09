# Step 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN pnpm install --no-frozen-lockfile
COPY . .

# Move to backend workspace and generate Prisma Client artifacts
WORKDIR /app/backend
RUN pnpm exec prisma generate
RUN pnpm run build

# Step 2: Execution stage
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
RUN pnpm install --prod --no-frozen-lockfile

# Copy generated Prisma engine binaries along with standard build distributions
COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=builder /app/node_modules/.bin /app/node_modules/.bin
COPY --from=builder /app/backend/dist ./backend/dist
# Schema + migrations required by Cloud Run Job (migrate/seed), not by runtime boot
COPY --from=builder /app/backend/prisma ./backend/prisma
EXPOSE 8080
ENV PORT=8080
CMD ["node", "backend/dist/main.js"]
