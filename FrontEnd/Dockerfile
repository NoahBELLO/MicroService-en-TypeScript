FROM node:alpine

WORKDIR /usr/src/app

EXPOSE 5173

RUN npm i

#ENTRYPOINT [ "tail", "-f", "/dev/null" ]
CMD [ "npm", "run", "dev" ]