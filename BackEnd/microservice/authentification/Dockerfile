FROM node:alpine

WORKDIR /usr/src/app

EXPOSE 3000

RUN npm install express mongodb dotenv nodemon typescript @types/node @types/express ts-node typescript
RUN npx tsc --init

# ENTRYPOINT [ "nodemon", "app.ts" ]
# ENTRYPOINT [ "nodemon" ] ?
ENTRYPOINT [ "tail", "-f", "/dev/null" ]