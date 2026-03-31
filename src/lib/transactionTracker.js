/**
 * Transaction Tracker Utility
 * Manages transaction status polling and lifecycle tracking
 */

import * as StellarSdk from '@stellar/stellar-sdk';

const TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes total

export const TRANSACTION_STATUS = {
  PENDING: 'pending',      // Before submission
  SUBMITTED: 'submitted',  // Just submitted
  CONFIRMED: 'confirmed',  // Found on ledger
  FAILED: 'failed',        // Transaction failed
};

// In-memory transaction cache (use localStorage for persistence across page reloads)
const transactionCache = new Map();

/**
 * Store transaction metadata locally
 * @param {string} hash - Transaction hash
 * @param {object} metadata - { recipients, amount, senderAddress, timestamp }
 */
export const storePendingTransaction = (hash, metadata) => {
  const txData = {
    hash,
    status: TRANSACTION_STATUS.SUBMITTED,
    recipients: metadata.recipients, // Array of { address, amount }
    totalAmount: metadata.totalAmount,
    senderAddress: metadata.senderAddress,
    timestamp: new Date().toISOString(),
    submitTime: Date.now(),
    pollingAttempts: 0,
  };

  // Store in memory
  transactionCache.set(hash, txData);

  // Persist to localStorage for recovery after page reload
  const stored = JSON.parse(localStorage.getItem('stellar_pending_transactions') || '{}');
  stored[hash] = txData;
  localStorage.setItem('stellar_pending_transactions', JSON.stringify(stored));

  return txData;
};

/**
 * Poll Horizon for transaction status
 * @param {string} hash - Transaction hash to check
 * @param {function} onStatusChange - Callback when status changes
 * @returns {Promise<object>} Final transaction status
 */
export const pollTransactionStatus = async (
  hash,
  onStatusChange = () => {}
) => {
  const server = new StellarSdk.Horizon.Server(TESTNET_HORIZON);
  let attempts = 0;

  return new Promise(async (resolve, reject) => {
    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        const response = await server.transactions().transaction(hash).call();

        // Transaction found on ledger - confirmed!
        if (response) {
          clearInterval(pollInterval);

          const txData = {
            hash,
            status: TRANSACTION_STATUS.CONFIRMED,
            ...response,
            confirmedAt: new Date().toISOString(),
          };

          // Update cache
          transactionCache.set(hash, txData);
          updatePendingTransactionStatus(hash, TRANSACTION_STATUS.CONFIRMED);

          // Call callback with final confirmed status
          onStatusChange({
            hash,
            status: TRANSACTION_STATUS.CONFIRMED,
            pollingAttempts: attempts,
            ...txData,
          });
          
          resolve(txData);
          return;
        }
      } catch (error) {
        // Transaction not yet found - continue polling
        if (error.response?.status === 404 && attempts < MAX_POLL_ATTEMPTS) {
          // Still pending, continue polling - update with current attempt count
          onStatusChange({
            hash,
            status: TRANSACTION_STATUS.SUBMITTED,
            pollingAttempts: attempts,
          });
        } else if (attempts >= MAX_POLL_ATTEMPTS) {
          // Polling timeout
          clearInterval(pollInterval);

          const txData = {
            hash,
            status: TRANSACTION_STATUS.FAILED,
            error: 'Transaction confirmation timeout after ' + attempts + ' attempts',
            confirmedAt: new Date().toISOString(),
          };

          transactionCache.set(hash, txData);
          updatePendingTransactionStatus(hash, TRANSACTION_STATUS.FAILED);

          onStatusChange(txData);
          resolve(txData);
          return;
        } else if (error.response?.status !== 404) {
          // Unexpected error (not 404 - which means transaction not found)
          clearInterval(pollInterval);
          console.error('Polling error:', error);
          reject(error);
          return;
        }
      }
    }, POLL_INTERVAL);
  });
};

/**
 * Update transaction status in localStorage
 */
export const updatePendingTransactionStatus = (hash, newStatus) => {
  const stored = JSON.parse(localStorage.getItem('stellar_pending_transactions') || '{}');
  if (stored[hash]) {
    stored[hash].status = newStatus;
    localStorage.setItem('stellar_pending_transactions', JSON.stringify(stored));
  }
  
  // Also update in-memory cache
  if (transactionCache.has(hash)) {
    const tx = transactionCache.get(hash);
    tx.status = newStatus;
  }
};

/**
 * Get pending transactions from localStorage
 */
export const getPendingTransactions = () => {
  const stored = JSON.parse(localStorage.getItem('stellar_pending_transactions') || '{}');
  return Object.values(stored);
};

/**
 * Get single transaction tracking data
 */
export const getTransactionData = (hash) => {
  return transactionCache.get(hash) || 
         JSON.parse(localStorage.getItem('stellar_pending_transactions') || '{}')[hash];
};

/**
 * Clear completed transaction from tracking
 */
export const clearTransactionTracking = (hash) => {
  transactionCache.delete(hash);
  
  const stored = JSON.parse(localStorage.getItem('stellar_pending_transactions') || '{}');
  delete stored[hash];
  localStorage.setItem('stellar_pending_transactions', JSON.stringify(stored));
};

/**
 * Parse Horizon error for user-friendly message
 */
export const parseHorizonError = (error) => {
  if (!error) return 'Unknown error occurred';

  // Check for insufficient balance
  if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
    return 'Insufficient balance. Please check your account.';
  }

  // Check for invalid destination
  if (error.message?.includes('destination') || error.message?.includes('INVALID_DESTINATION')) {
    return 'Invalid destination address. Please verify recipient address.';
  }

  // Check for bad sequence
  if (error.message?.includes('sequence') || error.message?.includes('BAD_SEQ')) {
    return 'Transaction sequence error. Please try again.';
  }

  // Check for operation limits
  if (error.message?.includes('operation') || error.message?.includes('TOO_MANY_OPERATIONS')) {
    return 'Too many operations in transaction. Maximum is 100.';
  }

  // Check for master key required
  if (error.message?.includes('master') || error.message?.includes('MASTER_KEY_REQUIRED')) {
    return 'Master key weight is zero. Cannot sign transactions.';
  }

  // HTTP status codes
  if (error.response?.status === 400) {
    return 'Invalid transaction - please verify all details.';
  }

  if (error.response?.status === 404) {
    return 'Account not found. Please fund your account first.';
  }

  // Generic message
  return error.message || 'Transaction failed. Please try again.';
};

/**
 * Validate multiple recipients
 */
export const validateRecipients = (recipients) => {
  const errors = [];

  if (!recipients || recipients.length === 0) {
    errors.push({ index: 0, message: 'At least one recipient is required' });
    return errors;
  }

  const seenAddresses = new Set();

  recipients.forEach((recipient, index) => {
    const { address, amount } = recipient;

    // Validate address
    if (!address?.trim()) {
      errors.push({ index, message: 'Address is required' });
    } else if (address.length !== 56 || !address.startsWith('G')) {
      errors.push({ index, message: 'Invalid Stellar address format' });
    } else if (!StellarSdk.StrKey.isValidEd25519PublicKey(address)) {
      errors.push({ index, message: 'Invalid Stellar address' });
    } else if (seenAddresses.has(address)) {
      errors.push({ index, message: 'Duplicate recipient address' });
    } else {
      seenAddresses.add(address);
    }

    // Validate amount
    if (!amount?.toString().trim()) {
      errors.push({ index, message: 'Amount is required' });
    } else {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        errors.push({ index, message: 'Amount must be positive' });
      } else if (numAmount < 0.0000001) {
        errors.push({ index, message: 'Amount too small (min: 0.0000001)' });
      } else if (numAmount > 999999999) {
        errors.push({ index, message: 'Amount too large' });
      }
    }
  });

  return errors;
};

/**
 * Calculate total amount across all recipients
 */
export const calculateTotalAmount = (recipients) => {
  return recipients.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
};
