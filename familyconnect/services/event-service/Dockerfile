# Build context là thư mục gốc của repo để image có cả shared/
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/event-service ./services/event-service
WORKDIR /app/services/event-service
RUN npm install --omit=dev
EXPOSE 3004
CMD ["node", "src/server.js"]
