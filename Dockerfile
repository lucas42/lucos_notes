FROM node:13-alpine

WORKDIR /web/lucos/notes

# Legacy method of installing resources was using the lucos_core library - installed in a relative location on the file system
RUN apk add git
RUN git clone https://github.com/lucas42/lucos_core.git /web/lucos/core

COPY . .

ENV NODE_ENV production
EXPOSE 8004

CMD [ "node", "server.js" ]