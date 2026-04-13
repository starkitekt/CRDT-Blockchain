#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HARDHAT_LOG="$ROOT_DIR/.local-hardhat.log"
HARDHAT_PID_FILE="$ROOT_DIR/.local-hardhat.pid"

ensure_env() {
  if [ ! -f "$ROOT_DIR/.env.local" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env.local"
  fi

  if ! grep -q '^MONGODB_URI=' "$ROOT_DIR/.env.local"; then
    echo 'MONGODB_URI=mongodb://127.0.0.1:27017/honeytrace' >> "$ROOT_DIR/.env.local"
  fi
  if ! grep -q '^LOCAL_RPC_URL=' "$ROOT_DIR/.env.local"; then
    echo 'LOCAL_RPC_URL=http://127.0.0.1:8545' >> "$ROOT_DIR/.env.local"
  fi
  if ! grep -q '^BLOCKCHAIN_RPC_URL=' "$ROOT_DIR/.env.local"; then
    echo 'BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545' >> "$ROOT_DIR/.env.local"
  fi
}

ensure_mongo() {
  if docker ps --format '{{.Names}}' | grep -q '^honeytrace-mongo$'; then
    echo 'Mongo container already running.'
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -q '^honeytrace-mongo$'; then
    docker start honeytrace-mongo >/dev/null
  else
    docker run -d --name honeytrace-mongo -p 27017:27017 mongo:7 >/dev/null
  fi
}

start_chain() {
  if [ -f "$HARDHAT_PID_FILE" ] && kill -0 "$(cat "$HARDHAT_PID_FILE")" 2>/dev/null; then
    echo 'Hardhat node already running.'
    return
  fi

  (cd "$ROOT_DIR" && nohup npm run chain:node > "$HARDHAT_LOG" 2>&1 & echo $! > "$HARDHAT_PID_FILE")

  for _ in {1..20}; do
    if curl -s -X POST http://127.0.0.1:8545 \
      -H 'Content-Type: application/json' \
      --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  echo 'Hardhat node failed to start. Check .local-hardhat.log'
  exit 1
}

configure_relayer() {
  local key
  key='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

  if [ -n "$key" ]; then
    if grep -q '^BLOCKCHAIN_RELAYER_PRIVATE_KEY=' "$ROOT_DIR/.env.local"; then
      sed -i "s|^BLOCKCHAIN_RELAYER_PRIVATE_KEY=.*$|BLOCKCHAIN_RELAYER_PRIVATE_KEY=$key|" "$ROOT_DIR/.env.local"
    else
      echo "BLOCKCHAIN_RELAYER_PRIVATE_KEY=$key" >> "$ROOT_DIR/.env.local"
    fi
    if grep -q '^DEPLOYER_PRIVATE_KEY=' "$ROOT_DIR/.env.local"; then
      sed -i "s|^DEPLOYER_PRIVATE_KEY=.*$|DEPLOYER_PRIVATE_KEY=$key|" "$ROOT_DIR/.env.local"
    else
      echo "DEPLOYER_PRIVATE_KEY=$key" >> "$ROOT_DIR/.env.local"
    fi
  fi
}

deploy_contracts() {
  (cd "$ROOT_DIR" && set -a && source .env.local && set +a && npm run chain:deploy:local)
  (cd "$ROOT_DIR" && npm run chain:sync)

  local address
  address="$(cd "$ROOT_DIR" && node -e 'const d=require("./deployments/addresses.json");process.stdout.write(d.localhost?.HoneyTraceRegistry||"")' 2>/dev/null || true)"
  if [ -n "$address" ]; then
    if grep -q '^HONEYTRACE_CONTRACT_ADDRESS=' "$ROOT_DIR/.env.local"; then
      sed -i "s|^HONEYTRACE_CONTRACT_ADDRESS=.*$|HONEYTRACE_CONTRACT_ADDRESS=$address|" "$ROOT_DIR/.env.local"
    else
      echo "HONEYTRACE_CONTRACT_ADDRESS=$address" >> "$ROOT_DIR/.env.local"
    fi
  fi
}

stop_chain() {
  if [ -f "$HARDHAT_PID_FILE" ]; then
    kill "$(cat "$HARDHAT_PID_FILE")" 2>/dev/null || true
    rm -f "$HARDHAT_PID_FILE"
  fi
}

cmd_up() {
  ensure_env
  ensure_mongo
  start_chain
  configure_relayer
  deploy_contracts
  (cd "$ROOT_DIR" && set -a && source .env.local && set +a && npm run seed)
  (cd "$ROOT_DIR" && npm run dev)
}

cmd_down() {
  stop_chain
  docker stop honeytrace-mongo >/dev/null 2>&1 || true
}

cmd_check() {
  (cd "$ROOT_DIR" && npm run chain:test)
  (cd "$ROOT_DIR" && npm run test:unit)
  (cd "$ROOT_DIR" && npm run build)
}

case "${1:-}" in
  up)
    cmd_up
    ;;
  down)
    cmd_down
    ;;
  check)
    cmd_check
    ;;
  *)
    echo 'Usage: bash scripts/localhost.sh {up|down|check}'
    exit 1
    ;;
esac