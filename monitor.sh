#!/bin/bash
echo "=== MyZubster Monitor $(date) ==="
echo ""

echo "📊 HEALTH:"
curl -s http://localhost:10000/api/health | jq -c '{status, uptime}'

echo -e "\n💰 SWAP RATE:"
curl -s http://localhost:10000/api/swap/rate | jq -c '.rates'

echo -e "\n🏆 REWARD TOTALI:"
curl -s "http://localhost:10000/api/rewards?userId=testuser" | jq '.data | length'

echo -e "\n🤖 STATO ROBOT:"
curl -s http://localhost:10000/api/robot/status/my-bot-001 | jq -c '.data | {status, jobsCompleted, totalEarned}'

echo -e "\n🌐 FRONTEND:"
curl -s http://localhost:10000 | grep -o '<title>.*</title>'
