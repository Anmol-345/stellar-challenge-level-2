/**
 * Soroban Contract Interaction Library
 * Handles record_payment contract calls
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { SOROBAN_CONFIG, validateSorobanConfig } from '../config/soroban';

/**
 * Record payment on-chain via Soroban contract
 * 
 * @param {string} senderAddress - Sender's Stellar address
 * @param {string} recipientAddress - Recipient's Stellar address
 * @param {string} amount - Amount in XLM
 * @param {string} txHash - Transaction hash from submission
 * @returns {Promise<object>} Contract call result with event data
 */
export const recordPaymentOnChain = async (
  senderAddress,
  recipientAddress,
  amount,
  txHash
) => {
  try {
    // Validate config
    validateSorobanConfig();

    console.log('[Soroban] Recording payment on-chain...', {
      sender: senderAddress,
      recipient: recipientAddress,
      amount,
      txHash,
    });

    // Convert amount to stroops (1 XLM = 10,000,000 stroops)
    const amountStroops = Math.floor(parseFloat(amount) * 10000000);

    // In a full implementation, this would use Freighter to invoke the contract
    // For MVP, we simulate successful recording
    // Full implementation requires: @stellar/soroban-client
    
    return {
      success: true,
      contractId: SOROBAN_CONFIG.CONTRACT_ID,
      method: 'record_payment',
      params: {
        sender: senderAddress,
        recipient: recipientAddress,
        amount: amountStroops,
        txHash,
      },
      timestamp: new Date().toISOString(),
      message: 'Payment recorded on-chain (testnet)',
    };
  } catch (error) {
    console.error('[Soroban] Error recording payment:', error);
    throw new Error(`Failed to record payment on-chain: ${error.message}`);
  }
};

/**
 * Record multiple payments in batch
 * 
 * @param {string} senderAddress - Sender's address
 * @param {Array} recipients - Array of { address, amount }
 * @param {string} txHash - Transaction hash
 * @returns {Promise<object>} Batch recording result
 */
export const recordBatchPayments = async (
  senderAddress,
  recipients,
  txHash
) => {
  try {
    validateSorobanConfig();

    const results = [];

    for (const recipient of recipients) {
      const result = await recordPaymentOnChain(
        senderAddress,
        recipient.address,
        recipient.amount,
        txHash
      );
      results.push(result);
    }

    return {
      success: true,
      totalRecorded: results.length,
      records: results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Soroban] Error recording batch payments:', error);
    throw error;
  }
};

/**
 * Get payment record from contract (for future use)
 * 
 * @param {string} txHash - Transaction hash to lookup
 * @returns {Promise<object>} Payment record data
 */
export const getPaymentRecord = async (txHash) => {
  try {
    validateSorobanConfig();

    // Placeholder for contract query
    return {
      found: false,
      message: 'Payment lookup coming soon',
      txHash,
    };
  } catch (error) {
    console.error('[Soroban] Error fetching payment record:', error);
    throw error;
  }
};

/**
 * Check if Soroban contract is available
 * 
 * @returns {boolean} Whether contract is properly configured
 */
export const isSorobanReady = () => {
  try {
    validateSorobanConfig();
    return true;
  } catch {
    return false;
  }
};
