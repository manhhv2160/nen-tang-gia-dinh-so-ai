# Build context là thư mục gốc của repo để image có cả shared/
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/heritage-service ./services/heritage-service
WORKDIR /app/services/heritage-service
RUN npm install --omit=dev
EXPOSE 3005
CMD ["node", "src/server.js"]
