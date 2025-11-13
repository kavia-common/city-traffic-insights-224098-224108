#!/bin/bash
cd /home/kavia/workspace/code-generation/city-traffic-insights-224098-224108/traffic_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

