# lucos Notes
An offline todo list

## Dependencies
* docker
* docker-compose

## Build-time Dependencies
* nodejs
* [lucos core](https://github.com/lucas42/lucos_core)

## Running
`nice -19 docker-compose up -d --no-build`

## Building
The build is configured to run in Dockerhub when a commit is pushed to the master branch in github.

# Persisting data
The web server holds all its data in memory for easy access.  (Yes, I know that's not very scalable, but it works for me).  It also attempts to backup the data on the filesystem.  It stores it in a file called data.json in the root of the project.  This allows for data to persist between restarts of the server.  If this file isn't writable for some reason, the server should still work, but you'll lose all your data once you stop the server.