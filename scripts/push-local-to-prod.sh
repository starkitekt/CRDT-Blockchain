#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=false
SKIP_CHECKS=false
ENV_FILE="$ROOT_DIR/.env.production.local"

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    --skip-checks)
      SKIP_CHECKS=true
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: bash scripts/push-local-to-prod.sh [--dry-run] [--skip-checks]"
      exit 1
      ;;
  esac
done

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

run_cmd() {
  if [ "$DRY_RUN" = true ]; then
    echo "[dry-run] $*"
    return 0
  fi
  eval "$@"
}

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required env var: $name"
    exit 1
  fi
}

set_vercel_env() {
  local key="$1"
  local value="$2"
  local token_args=""

  if [ -n "${VERCEL_TOKEN:-}" ]; then
    token_args="--token $VERCEL_TOKEN"
  fi

  run_cmd "cd '$ROOT_DIR' && npx vercel env rm '$key' production --yes $token_args >/dev/null 2>&1 || true"
  run_cmd "cd '$ROOT_DIR' && printf '%s' '$value' | npx vercel env add '$key' production $token_args >/dev/null"
}

echo "== HoneyTRACE production promotion =="
echo "Target chain: Base Sepolia"
echo "Target hosting: Vercel"

require_env BASE_SEPOLIA_RPC_URL
require_env DEPLOYER_PRIVATE_KEY
require_env BLOCKCHAIN_RELAYER_PRIVATE_KEY
require_env MONGODB_URI_PROD
require_env JWT_SECRET_PROD

if [ "$SKIP_CHECKS" = false ]; then
  run_cmd "cd '$ROOT_DIR' && npm run chain:test"
  run_cmd "cd '$ROOT_DIR' && npm run test:unit"
fi

run_cmd "cd '$ROOT_DIR' && npm run chain:compile"
run_cmd "cd '$ROOT_DIR' && npm run chain:deploy:base"
run_cmd "cd '$ROOT_DIR' && SYNC_NETWORK=baseSepolia SYNC_ENV_FILE=.env.production SYNC_CONTRACT_ENV_KEY=NEXT_PUBLIC_HONEYTRACE_CONTRACT npm run chain:sync"

DEPLOYED_CONTRACT_ADDRESS="$(cd "$ROOT_DIR" && node -e 'const d=require("./deployments/addresses.json"); process.stdout.write(d.baseSepolia?.HoneyTraceRegistry || "")')"
if [ -z "$DEPLOYED_CONTRACT_ADDRESS" ]; then
  if [ "$DRY_RUN" = true ]; then
    DEPLOYED_CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000"
    echo "[dry-run] Base Sepolia deployment address not found yet. Using placeholder address for command preview."
  else
    echo "Could not resolve deployed Base Sepolia contract address from deployments/addresses.json"
    exit 1
  fi
fi

echo "Resolved Base Sepolia contract: $DEPLOYED_CONTRACT_ADDRESS"

set_vercel_env MONGODB_URI "$MONGODB_URI_PROD"
set_vercel_env JWT_SECRET "$JWT_SECRET_PROD"
set_vercel_env BLOCKCHAIN_RPC_URL "$BASE_SEPOLIA_RPC_URL"
set_vercel_env BASE_SEPOLIA_RPC_URL "$BASE_SEPOLIA_RPC_URL"
set_vercel_env DEPLOYER_PRIVATE_KEY "$DEPLOYER_PRIVATE_KEY"
set_vercel_env BLOCKCHAIN_RELAYER_PRIVATE_KEY "$BLOCKCHAIN_RELAYER_PRIVATE_KEY"
set_vercel_env HONEYTRACE_CONTRACT_ADDRESS "$DEPLOYED_CONTRACT_ADDRESS"
set_vercel_env NEXT_PUBLIC_HONEYTRACE_CONTRACT "$DEPLOYED_CONTRACT_ADDRESS"
set_vercel_env NEXT_PUBLIC_MIN_BALANCE_ETH "${NEXT_PUBLIC_MIN_BALANCE_ETH:-0.002}"

if [ -n "${PLAYWRIGHT_BASE_URL:-}" ]; then
  set_vercel_env PLAYWRIGHT_BASE_URL "$PLAYWRIGHT_BASE_URL"
fi

VERCEL_TOKEN_ARG=""
if [ -n "${VERCEL_TOKEN:-}" ]; then
  VERCEL_TOKEN_ARG="--token $VERCEL_TOKEN"
fi

run_cmd "cd '$ROOT_DIR' && npx vercel deploy --prod --yes $VERCEL_TOKEN_ARG"

echo "Promotion complete."
echo "Contract deployed on Base Sepolia: $DEPLOYED_CONTRACT_ADDRESS"
