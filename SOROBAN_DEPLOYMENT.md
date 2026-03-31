# Soroban Contract Deployment Guide

## Prerequisites
- Stellar CLI installed: `curl https://github.com/stellar/rs-soroban-sdk/releases/download/21.3.0/soroban-cli-21.3.0-x86_64-unknown-linux-gnu.tar.gz | tar xz`
- For macOS: Use Homebrew or compile from source
- Freighter wallet with testnet account funded with XLM
- Node.js for JavaScript environment

## Step 1: Build the Contract

```bash
cd soroban
cargo build --target wasm32-unknown-unknown --release
```

Output: `target/wasm32-unknown-unknown/release/payment_recorder.wasm`

## Step 2: Wrap Contract (Required for JS interaction)

```bash
soroban contract build --manifest-path soroban/Cargo.toml
```

This generates:
- `soroban-token.wasm` - wrapped contract
- `soroban-token.js` - TS/JS TypeScript bindings (optional)

## Step 3: Deploy to Testnet

### Option A: Using Stellar CLI

```bash
# Set testnet RPC
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
export SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Deploy contract
soroban contract deploy \
  --wasm soroban/target/wasm32-unknown-unknown/release/payment_recorder.wasm \
  --source-account YOUR_ACCOUNT_ID \
  --network testnet
```

This returns: `CONTRACT_ID`

### Option B: Using Horizon API (JavaScript)

```javascript
const { Keypair, TransactionBuilder, Server, BASE_FEE } = require('@stellar/stellar-sdk');
const fs = require('fs');

const contractWasm = fs.readFileSync('soroban/target/wasm32-unknown-unknown/release/payment_recorder.wasm');
const contractBuffer = Buffer.from(contractWasm);

// Deploy via HostFunction (requires Freighter to sign)
// See frontend integration section
```

## Step 4: Save Contract ID

After deployment, you'll get a CONTRACT_ID like:
```
CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
```

Add to your React app:

**File: `src/config/soroban.js`**
```javascript
export const SOROBAN_CONFIG = {
  RPC_URL: "https://soroban-testnet.stellar.org",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  CONTRACT_ID: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4", // Replace with your contract ID
};
```

## Step 5: Verify Deployment

```bash
soroban contract info \
  --id CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4 \
  --network testnet
```

## Troubleshooting

### "wasm compilation failed"
- Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Add wasm target: `rustup target add wasm32-unknown-unknown`

### "Account not found"
- Fund your account at [Friendbot](https://laboratory.stellar.org/?network=test#friendbot)

### "RPC connection failed"
- Check: `curl -I https://soroban-testnet.stellar.org`
- Verify network is online

### "Contract not found after deployment"
- Wait 10-15 seconds for ledger to update
- Verify CONTRACT_ID is correct

---

## Quick Reference

```bash
# Full deployment script
cd soroban
cargo build --target wasm32-unknown-unknown --release
soroban contract build

# Then deploy via CLI or JavaScript
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/payment_recorder.wasm --source-account <YOUR_ID> --network testnet
```

**Next Steps**: Update `src/config/soroban.js` with your deployed CONTRACT_ID, then run the React app.
