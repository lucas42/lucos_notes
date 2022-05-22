# lucos Notes
An offline todo list

## Dependencies
* docker
* docker-compose

## Build-time Dependencies
* nodejs
* npm
* [lucos core](https://github.com/lucas42/lucos_core)

## Running
`nice -19 docker-compose up -d --no-build`

## Building
The build is configured to run in Dockerhub when a commit is pushed to the master branch in github.

## Data persistence
All data is held in memory (there's not a great deal of it).  After data is altered, it as also asynchronously written to the filesystem.  This file lives on a docker volume, so it can persist restarts.  Data is only ever read from filesystem on startup (and as part of monitoring, but that doesn't get used).  If data is restored from a backup, the service needs to be restarted for the data to be picked up (note any data edits prior to a restart will completely replace the restored backup on the filesystem).