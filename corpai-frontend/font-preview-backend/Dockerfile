FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY index.js ./

ENV NODE_ENV=production \
    PORT=80 \
    FONTS_DIR=/data/fonts

EXPOSE 80
CMD ["node", "index.js"]
