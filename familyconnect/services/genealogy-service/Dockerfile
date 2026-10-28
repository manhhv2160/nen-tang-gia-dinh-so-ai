# Build context là thư mục gốc của repo để image có cả shared/
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY services/genealogy-service ./services/genealogy-service
WORKDIR /app/services/genealogy-service
RUN npm install --omit=dev
EXPOSE 3002
CMD ["node", "src/server.js"]
