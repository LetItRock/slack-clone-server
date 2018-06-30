#! /bin/bash
npm run build
docker build -t slack-clone-server .
# docker run -p 8081:8081 slack-clone-server