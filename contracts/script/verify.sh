#!/usr/bin/env bash
# Verifies every deployed contract on Sourcify, and on BaseScan when BASESCAN_API_KEY is set.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

J=deployments/base-sepolia.json
get() { jq -r ".$1" "$J"; }
TUSDC=$(get MockUSDC); REG=$(get SavingsRegistry); FAC=$(get CircleFactory); FAKE=$(get FakeCircleDemo)
USDC=$(get USDC); EAS=$(get EAS); CHAIN=$(get chainId)

REAL=()
for i in 0 1 2; do
  h=$(cast keccak "$(cast abi-encode 'f(string,uint256)' giliran.fake.real $i)")
  REAL+=("0x${h: -40}")
done

contracts=(
  "$TUSDC|src/MockUSDC.sol:MockUSDC|"
  "$REG|src/SavingsRegistry.sol:SavingsRegistry|$(cast abi-encode 'c(address,address)' "$FAC" "$EAS")"
  "$FAC|src/CircleFactory.sol:CircleFactory|$(cast abi-encode 'c(address,address,address)' "$REG" "$TUSDC" "$USDC")"
  "$FAKE|src/demo/FakeCircleDemo.sol:FakeCircleDemo|$(cast abi-encode 'c(address,uint256,address[3])' "$TUSDC" 10000000 "[${REAL[0]},${REAL[1]},${REAL[2]}]")"
)

for entry in "${contracts[@]}"; do
  IFS='|' read -r addr name args <<<"$entry"
  extra=()
  [ -n "$args" ] && extra+=(--constructor-args "$args")
  echo "== $name @ $addr"
  forge verify-contract "$addr" "$name" --chain "$CHAIN" --verifier sourcify "${extra[@]}" --watch || true
  if [ -n "${BASESCAN_API_KEY:-}" ]; then
    forge verify-contract "$addr" "$name" --chain "$CHAIN" --verifier etherscan \
      --etherscan-api-key "$BASESCAN_API_KEY" "${extra[@]}" --watch || true
  fi
done
