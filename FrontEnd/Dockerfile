FROM node:alpine

WORKDIR /usr/src/app

EXPOSE 5173

RUN npm install react react-dom

#ENTRYPOINT [ "tail", "-f", "/dev/null" ]
CMD [ "npm", "run", "dev" ]