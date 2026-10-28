# Build context là thư mục gốc của repo để image có cả shared/
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/report-service ./services/report-service
WORKDIR /app/services/report-service
RUN npm install --omit=dev
EXPOSE 3007
CMD ["node", "src/server.js"]
