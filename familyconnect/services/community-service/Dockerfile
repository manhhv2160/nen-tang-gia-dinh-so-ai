# Build context là thư mục gốc của repo để image có cả shared/
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/community-service ./services/community-service
WORKDIR /app/services/community-service
RUN npm install --omit=dev
EXPOSE 3003
CMD ["node", "src/server.js"]
