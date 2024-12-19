FROM node:alpine

WORKDIR /usr/src/app

EXPOSE 3000

RUN npm i
RUN npm install -g nodemon

ENTRYPOINT [ "nodemon", "app.ts" ]