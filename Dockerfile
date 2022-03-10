FROM node:17-alpine

WORKDIR /usr/src/app
COPY package* ./

RUN npm install

COPY src .

ENV NODE_ENV production
ENV PORT 8004
EXPOSE $PORT

CMD [ "npm", "start" ]