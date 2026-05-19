#!/usr/bin/env bash
# 一次性脚本：启动 backend，等待端口监听，跑 admin 接口冒烟测试，然后停掉。
set -e
cd "$(dirname "$0")/../backend"

# 启 backend
nohup go run . > /tmp/research-go.log 2>&1 &
BACK_PID=$!
echo "backend pid=$BACK_PID"

# 等端口
for i in $(seq 1 30); do
  if lsof -nP -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

echo "=== login ==="
LOGIN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@research.com","password":"admin123"}')
echo "$LOGIN" | head -c 200; echo
TOKEN=$(echo "$LOGIN" | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')

echo "=== list organizations ==="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/admin/organizations
echo

echo "=== create organization ==="
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"测试机构A","description":"冒烟用"}' \
  http://localhost:8080/api/v1/admin/organizations
echo

echo "=== list users (all) ==="
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/admin/users?page=1&pageSize=10"
echo

echo "=== shutdown ==="
kill $BACK_PID 2>/dev/null || true
wait $BACK_PID 2>/dev/null || true