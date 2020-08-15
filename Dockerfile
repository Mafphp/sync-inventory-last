FROM node:latest
WORKDIR /usr/src/app
COPY package*.json ./
RUN apt-get update && apt install sshpass -y
RUN npm install
COPY . .
CMD [ "node", "index.js" ]