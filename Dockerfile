FROM node:12

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Create sessions directory
RUN mkdir -p /app/sessions && chown node:node /app/sessions

EXPOSE 3000

USER node

CMD ["npm", "run", "start"]