# Build context là thư mục gốc của repo để image có cả shared/
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/auth-service ./services/auth-service
WORKDIR /app/services/auth-service
RUN npm install --omit=dev
EXPOSE 3001
CMD ["node", "src/server.js"]
