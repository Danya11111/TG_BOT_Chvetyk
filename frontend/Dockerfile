FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server
# --host 0.0.0.0 позволяет принимать запросы от всех хостов (включая ngrok)
# В Vite 5.4+ при использовании --host проверка хоста должна быть отключена
CMD ["npm", "run", "dev"]
