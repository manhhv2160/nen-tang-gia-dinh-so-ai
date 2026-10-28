# Build context là thư mục gốc của repo để image có cả shared/
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/ai-service ./services/ai-service
WORKDIR /app/services/ai-service
RUN npm install --omit=dev
EXPOSE 3006
CMD ["node", "src/server.js"]
