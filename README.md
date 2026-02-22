# lucos Notes
An offline todo list

## Dependencies
* docker
* docker compose

## Build-time Dependencies
* nodejs
* npm

## Running
`nice -19 docker compose up -d --no-build`

## Building
The build is configured to run in Dockerhub when a commit is pushed to the main branch in github.

## Data persistence
All data is held in memory (there's not a great deal of it).  After data is altered, it as also written to the filesystem.  This file lives on a docker volume, so it can persist restarts.  Data is only ever read from filesystem on startup (and as part of monitoring, but that doesn't get used).  If data is restored from a backup, the service needs to be restarted for the data to be picked up (note any data edits prior to a restart will completely replace the restored backup on the filesystem).

## Backups

Copy the file from the docker host at /var/lib/docker/volumes/lucos_notes_stateFile/_data/data_v2.json
For example:
cp /var/lib/docker/volumes/lucos_notes_stateFile/_data/data_v2.json manual-backups/notes-`date +%F`.json
