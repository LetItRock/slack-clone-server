#! /bin/bash
npm run build
docker build -t letitrock/slack-clone-server:latest .
docker push letitrock/slack-clone-server:latest