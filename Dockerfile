FROM node:23-alpine

WORKDIR /usr/src/app
COPY package* ./

RUN npm install

COPY src .

## Run the build step and then delete everything which only gets used for the build
RUN npm run build
RUN npm prune --omit=dev
RUN rm -rf client service-worker webpack*

ENV NODE_ENV production
ENV PORT 8004
EXPOSE $PORT

CMD [ "npm", "start" ]