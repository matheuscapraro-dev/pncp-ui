FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Clean dev deps
RUN npm prune --omit=dev

CMD ["node", "--max-old-space-size=512", "dist/index.js"]
