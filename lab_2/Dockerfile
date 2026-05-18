FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
# створюємо папки і даємо права до переключення на non-root user
RUN mkdir -p data/backups uploads && \
    addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app
USER app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]