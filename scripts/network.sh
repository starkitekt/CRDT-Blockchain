#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

HARDHAT_ACCOUNT_0='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
BASE_SEPOLIA_RPC='https://sepolia.base.org'
LOCAL_RPC='http://127.0.0.1:8545'

ensure_env() {
  if [ ! -f "$ENV_FILE" ]; then
    cp "$ROOT_DIR/.env.example" "$ENV_FILE"
  fi
}

set_env_var() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*$|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

get_address() {
  local network="$1"
  node -e "const d=require('$ROOT_DIR/deployments/addresses.json');process.stdout.write(d['${network}']?.HoneyTraceRegistry||'')" 2>/dev/null || true
}

show_status() {
  echo ''
  echo '─── Current .env.local network config ───'
  grep -E '^(BLOCKCHAIN_RPC_URL|HONEYTRACE_CONTRACT_ADDRESS|NEXT_PUBLIC_HONEYTRACE_CONTRACT|DEPLOYER_PRIVATE_KEY)=' "$ENV_FILE" 2>/dev/null | \
    sed 's/\(PRIVATE_KEY=\)0x.\{4\}.\+/\1****/' || true
  echo '──────────────────────────────────────────'
  echo ''
}

switch_to_localhost() {
  echo '[network] Switching to localhost (Hardhat)...'
  ensure_env

  set_env_var 'BLOCKCHAIN_RPC_URL' "$LOCAL_RPC"
  set_env_var 'DEPLOYER_PRIVATE_KEY' "$HARDHAT_ACCOUNT_0"
  set_env_var 'BLOCKCHAIN_RELAYER_PRIVATE_KEY' "$HARDHAT_ACCOUNT_0"

  local addr
  addr="$(get_address 'localhost')"
  if [ -n "$addr" ]; then
    set_env_var 'HONEYTRACE_CONTRACT_ADDRESS' "$addr"
    set_env_var 'NEXT_PUBLIC_HONEYTRACE_CONTRACT' "$addr"
    echo "[network] Using existing localhost contract: $addr"
  else
    echo '[network] No localhost contract found — run: npm run net:deploy:local'
  fi

  show_status
  echo '[network] Switched to localhost.'
}

switch_to_base_sepolia() {
  echo '[network] Switching to Base Sepolia...'
  ensure_env

  set_env_var 'BLOCKCHAIN_RPC_URL' "$BASE_SEPOLIA_RPC"
  set_env_var 'BASE_SEPOLIA_RPC_URL' "$BASE_SEPOLIA_RPC"

  local current_key
  current_key="$(grep '^DEPLOYER_PRIVATE_KEY=' "$ENV_FILE" | cut -d= -f2-)"
  if [ -z "$current_key" ] || [ "$current_key" = "$HARDHAT_ACCOUNT_0" ]; then
    if [ -f "$ROOT_DIR/.env.production.local" ]; then
      local prod_key
      prod_key="$(grep '^DEPLOYER_PRIVATE_KEY=' "$ROOT_DIR/.env.production.local" | cut -d= -f2-)"
      if [ -n "$prod_key" ]; then
        set_env_var 'DEPLOYER_PRIVATE_KEY' "$prod_key"
        set_env_var 'BLOCKCHAIN_RELAYER_PRIVATE_KEY' "$prod_key"
      fi
    fi
    current_key="$(grep '^DEPLOYER_PRIVATE_KEY=' "$ENV_FILE" | cut -d= -f2-)"
    if [ -z "$current_key" ] || [ "$current_key" = "$HARDHAT_ACCOUNT_0" ]; then
      echo '[network] WARNING: DEPLOYER_PRIVATE_KEY is not set for Base Sepolia.'
      echo '          Set it in .env.local or .env.production.local before deploying.'
    fi
  fi

  local addr
  addr="$(get_address 'baseSepolia')"
  if [ -n "$addr" ]; then
    set_env_var 'HONEYTRACE_CONTRACT_ADDRESS' "$addr"
    set_env_var 'NEXT_PUBLIC_HONEYTRACE_CONTRACT' "$addr"
    echo "[network] Using existing Base Sepolia contract: $addr"
  else
    echo '[network] No Base Sepolia contract found — run: npm run net:deploy:base'
  fi

  show_status
  echo '[network] Switched to Base Sepolia.'
}

deploy_localhost() {
  echo '[network] Deploying to localhost...'
  switch_to_localhost

  (cd "$ROOT_DIR" && set -a && source "$ENV_FILE" && set +a && npm run chain:compile)
  (cd "$ROOT_DIR" && set -a && source "$ENV_FILE" && set +a && npm run chain:deploy:local)
  (cd "$ROOT_DIR" && npm run chain:sync)

  local addr
  addr="$(get_address 'localhost')"
  if [ -n "$addr" ]; then
    set_env_var 'HONEYTRACE_CONTRACT_ADDRESS' "$addr"
    set_env_var 'NEXT_PUBLIC_HONEYTRACE_CONTRACT' "$addr"
    echo "[network] Deployed to localhost: $addr"
  fi

  show_status
}

deploy_base_sepolia() {
  echo '[network] Deploying to Base Sepolia...'
  switch_to_base_sepolia

  local key
  key="$(grep '^DEPLOYER_PRIVATE_KEY=' "$ENV_FILE" | cut -d= -f2-)"
  if [ -z "$key" ] || [ "$key" = "$HARDHAT_ACCOUNT_0" ]; then
    echo '[network] ERROR: Cannot deploy to Base Sepolia with the Hardhat default key.'
    echo '          Set DEPLOYER_PRIVATE_KEY in .env.local or .env.production.local'
    exit 1
  fi

  (cd "$ROOT_DIR" && set -a && source "$ENV_FILE" && set +a && npm run chain:compile)
  (cd "$ROOT_DIR" && set -a && source "$ENV_FILE" && set +a && npm run chain:deploy:base)
  (cd "$ROOT_DIR" && npm run chain:sync)

  local addr
  addr="$(get_address 'baseSepolia')"
  if [ -n "$addr" ]; then
    set_env_var 'HONEYTRACE_CONTRACT_ADDRESS' "$addr"
    set_env_var 'NEXT_PUBLIC_HONEYTRACE_CONTRACT' "$addr"
    echo "[network] Deployed to Base Sepolia: $addr"
  fi

  show_status
}

deploy_both() {
  echo '[network] Deploying to both networks...'
  echo ''

  # localhost first (needs Hardhat node running)
  deploy_localhost
  echo ''

  # Base Sepolia
  deploy_base_sepolia
  echo ''

  echo '[network] Both deployments complete.'
  echo '          .env.local is currently set to Base Sepolia (last deployed).'
  echo '          Run "npm run net:local" to switch back to localhost.'
}

cmd_status() {
  echo '[network] Current configuration:'
  if [ ! -f "$ENV_FILE" ]; then
    echo '  .env.local does not exist.'
    return
  fi

  local rpc
  rpc="$(grep '^BLOCKCHAIN_RPC_URL=' "$ENV_FILE" | cut -d= -f2-)"
  if echo "$rpc" | grep -qi 'sepolia'; then
    echo "  Network: Base Sepolia"
  elif echo "$rpc" | grep -qi '127.0.0.1\|localhost'; then
    echo "  Network: Localhost (Hardhat)"
  else
    echo "  Network: Unknown ($rpc)"
  fi

  show_status

  echo '  Deployment addresses:'
  if [ -f "$ROOT_DIR/deployments/addresses.json" ]; then
    node -e "
      const a=require('$ROOT_DIR/deployments/addresses.json');
      for(const[n,v] of Object.entries(a)){
        const addr=v.HoneyTraceRegistry||'(not deployed)';
        console.log('    '+n+': '+addr);
      }
    "
  else
    echo '    No deployments/addresses.json found.'
  fi
}

case "${1:-}" in
  local)
    switch_to_localhost
    ;;
  base)
    switch_to_base_sepolia
    ;;
  deploy:local)
    deploy_localhost
    ;;
  deploy:base)
    deploy_base_sepolia
    ;;
  deploy:both)
    deploy_both
    ;;
  status)
    cmd_status
    ;;
  *)
    echo 'Usage: bash scripts/network.sh {local|base|deploy:local|deploy:base|deploy:both|status}'
    echo ''
    echo 'Commands:'
    echo '  local         Switch .env.local to localhost (Hardhat)'
    echo '  base          Switch .env.local to Base Sepolia'
    echo '  deploy:local  Deploy contract to localhost + switch'
    echo '  deploy:base   Deploy contract to Base Sepolia + switch'
    echo '  deploy:both   Deploy to both networks'
    echo '  status        Show current network config'
    exit 1
    ;;
esac
