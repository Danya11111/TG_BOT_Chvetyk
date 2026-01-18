FROM node:20-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend ./
RUN npm install --no-audit --no-fund @rollup/rollup-linux-x64-gnu
RUN npm run build

FROM node:20-slim AS backend-build

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --no-audit --no-fund

COPY backend ./
RUN npm run build

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package*.json ./
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
