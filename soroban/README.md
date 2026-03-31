# Soroban Payment Recorder Contract

A Stellar Soroban smart contract for recording XLM payment transactions on the testnet.

## Building

```bash
cargo build --target wasm32-unknown-unknown --release
```

Output: `target/wasm32-unknown-unknown/release/payment_recorder.wasm`

## Functions

- `record_payment(from, to, amount, timestamp)` - Records a payment transaction
- `get_payments()` - Returns all recorded payments
- `get_payment_count()` - Returns the number of recorded payments
- `clear_payments()` - Clears all recorded payments

## Deployment

See [SOROBAN_DEPLOYMENT.md](../SOROBAN_DEPLOYMENT.md) for deployment instructions.
