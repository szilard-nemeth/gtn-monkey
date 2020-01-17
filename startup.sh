#! /bin/bash

#TODO migrate this to npm script
#Start live-server TODO specify port 8080
cd /Users/szilardnemeth/development/my-repos/gtn-monkey/
live-server &

#Start CORS-anywhere server TODO specify port 8081
cd /Users/szilardnemeth/development/other-repos/cors-anywhere/
export PORT=8081
export CORSANYWHERE_WHITELIST=https://jira.cloudera.com,http://jira.cloudera.com
node server.js &