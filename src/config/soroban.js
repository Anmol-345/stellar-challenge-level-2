/**
 * Soroban Configuration
 * Update CONTRACT_ID after deployment
 */

export const SOROBAN_CONFIG = {
  RPC_URL: "https://soroban-testnet.stellar.org",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  CONTRACT_ID: "", // ⚠️ SET THIS AFTER CONTRACT DEPLOYMENT
  NATIVE_ASSET: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4", // Testnet native token
};

export const CONTRACT_METHODS = {
  RECORD_PAYMENT: "record_payment",
  GET_PAYMENT: "get_payment",
};

/**
 * Validate that contract is configured before use
 */
export const validateSorobanConfig = () => {
  if (!SOROBAN_CONFIG.CONTRACT_ID) {
    throw new Error(
      "Soroban contract not deployed. See SOROBAN_DEPLOYMENT.md for setup instructions."
    );
  }
  return true;
};
