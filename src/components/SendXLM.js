import React, { useState } from 'react'
import { retrievePublicKey, userSignTransaction } from './Freighter'
import TransactionStatus from './TransactionStatus'
import * as StellarSdk from '@stellar/stellar-sdk'
import {
  storePendingTransaction,
  validateRecipients,
  calculateTotalAmount,
  parseHorizonError,
} from '../lib/transactionTracker'

const SendXLM = ({ publicKey: propPublicKey, onBack }) => {
  // Multi-recipient state
  const [recipients, setRecipients] = useState([{ address: '', amount: '' }]);
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);

  // Transaction tracking state
  const [transactionHash, setTransactionHash] = useState("");
  const [transactionRecipients, setTransactionRecipients] = useState([]);
  const [senderAddress, setSenderAddress] = useState("");
  const [showStatusTracker, setShowStatusTracker] = useState(false);


  const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
  const networkPassphrase = 'Test SDF Network ; September 2015';

  /**
   * Update recipient at index
   */
  const updateRecipient = (index, field, value) => {
    const newRecipients = [...recipients];
    newRecipients[index][field] = value;
    setRecipients(newRecipients);
    // Clear errors for this field when user starts typing
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  /**
   * Add new recipient row
   */
  const addRecipient = () => {
    if (recipients.length < 100) { // Stellar max 100 operations per tx
      setRecipients([...recipients, { address: '', amount: '' }]);
    } else {
      setAlert({ type: 'error', message: 'Maximum 100 recipients per transaction' });
    }
  };

  /**
   * Remove recipient at index
   */
  const removeRecipient = (index) => {
    if (recipients.length > 1) {
      const newRecipients = recipients.filter((_, i) => i !== index);
      setRecipients(newRecipients);
      // Clean up errors for removed index
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    } else {
      setAlert({ type: 'error', message: 'At least one recipient is required' });
    }
  };

  /**
   * Validate all recipients
   */
  const validateForm = () => {
    const validationErrors = validateRecipients(recipients);
    const errorMap = {};
    validationErrors.forEach(err => {
      errorMap[err.index] = err.message;
    });
    setErrors(errorMap);
    return validationErrors.length === 0;
  };


  /**
   * Build multi-operation transaction
   */
  const sendPayment = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setAlert({ type: 'error', message: 'Please fix errors above' });
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      setTransactionHash("");

      // Step 1: Get sender's public key
      let senderAddr = propPublicKey;
      if (!senderAddr) {
        try {
          senderAddr = await retrievePublicKey();
        } catch (error) {
          throw new Error("Failed to retrieve your wallet address. Please ensure Freighter is connected.");
        }
      }

      if (!senderAddr || senderAddr.trim() === "") {
        throw new Error("Wallet not connected. Please connect your Freighter wallet first.");
      }

      setSenderAddress(senderAddr);

      setAlert({ type: 'info', message: 'Loading your account...' });

      // Step 2: Load sender's account from network
      let account;
      try {
        account = await server.loadAccount(senderAddr);
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error("Account not found on Stellar Network. Please fund your account first using Friendbot.");
        } else if (error.response?.status === 400) {
          throw new Error("Invalid account address. Please check your Freighter wallet.");
        }
        throw error;
      }

      setAlert({ type: 'info', message: 'Building transaction with multiple payments...' });

      // Step 3: Create TransactionBuilder
      const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: networkPassphrase,
      });

      // Step 4: Add payment operation for EACH recipient
      recipients.forEach((recipient) => {
        transactionBuilder.addOperation(
          StellarSdk.Operation.payment({
            destination: recipient.address,
            asset: StellarSdk.Asset.native(), // XLM
            amount: parseFloat(recipient.amount).toFixed(7),
          })
        );
      });

      // Step 5: Add optional memo
      if (memo && memo.trim()) {
        transactionBuilder.addMemo(StellarSdk.Memo.text(memo.substring(0, 28)));
      }

      // Step 6: Set timeout and build transaction
      const transaction = transactionBuilder
        .setTimeout(180) // 3 minutes
        .build();

      setAlert({ type: 'info', message: 'Requesting signature from Freighter...' });

      // Step 7: Sign transaction via Freighter
      const xdr = transaction.toEnvelope().toXDR('base64');
      let signedXdr;
      try {
        signedXdr = await userSignTransaction(xdr, networkPassphrase, senderAddr);

        if (!signedXdr) {
          throw new Error('Transaction signing failed: Wallet did not return signed transaction');
        }
        if (typeof signedXdr !== 'string') {
          throw new Error('Invalid response from Freighter: expected XDR string but got ' + typeof signedXdr);
        }
      } catch (error) {
        throw new Error("Transaction sign request cancelled or failed. Details: " + error.message);
      }

      setAlert({ type: 'info', message: 'Submitting transaction to Stellar Network...' });

      // Step 8: Submit to network
      let transactionToSubmit;
      try {
        if (typeof StellarSdk.TransactionBuilder?.fromXDR === 'function') {
          transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
        } else if (typeof StellarSdk.Envelope?.fromXDR === 'function') {
          transactionToSubmit = StellarSdk.Envelope.fromXDR(signedXdr, networkPassphrase);
        } else {
          transactionToSubmit = new StellarSdk.Envelope(
            StellarSdk.xdr.TransactionEnvelope.fromXDR(signedXdr, 'base64'),
            networkPassphrase
          );
        }
      } catch (error) {
        console.error("XDR parsing error:", error);
        throw new Error('Failed to reconstruct transaction from signed XDR: ' + error.message);
      }

      let result;
      try {
        result = await server.submitTransaction(transactionToSubmit);
      } catch (error) {
        console.error("Submission error:", error);
        const errorMessage = parseHorizonError(error);
        throw new Error(errorMessage);
      }

      // Step 9: Store transaction for tracking
      const txHash = result.hash;
      setTransactionHash(txHash);
      setTransactionRecipients(recipients);

      // Store in transaction tracker
      storePendingTransaction(txHash, {
        recipients: recipients,
        totalAmount: calculateTotalAmount(recipients),
        senderAddress: senderAddr,
      });

      // Show status tracker
      setShowStatusTracker(true);

      // Clear form after brief delay
      setTimeout(() => {
        setRecipients([{ address: '', amount: '' }]);
        setMemo("");
      }, 500);

    } catch (error) {
      console.error("Payment error:", error);
      setAlert({
        type: 'error',
        message: error.message || "Transaction failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show transaction status tracker while polling
  if (showStatusTracker && transactionHash) {
    return (
      <TransactionStatus
        transactionHash={transactionHash}
        recipients={transactionRecipients}
        totalAmount={calculateTotalAmount(transactionRecipients)}
        senderAddress={senderAddress}
        onClose={() => {
          setShowStatusTracker(false);
          setTransactionHash("");
          onBack?.();
        }}
      />
    );
  }

  // Main payment form with multi-recipient input
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-lg mx-auto bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 font-semibold mb-4 inline-flex items-center"
          >
            ← Back
          </button>
          <h2 className="text-3xl font-bold text-white">Send XLM</h2>
          <p className="text-slate-400 text-sm mt-2">
            Send to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} in one transaction
          </p>
        </div>

        {/* Alert Messages */}
        {alert && (
          <div
            className={`mb-6 p-4 rounded-lg font-semibold text-sm ${
              alert.type === "success"
                ? "bg-green-900 text-green-200 border border-green-700"
                : alert.type === "error"
                ? "bg-red-900 text-red-200 border border-red-700"
                : "bg-blue-900 text-blue-200 border border-blue-700"
            }`}
          >
            {alert.message}
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={sendPayment} className="space-y-4">
          {/* Recipients List */}
          <div className="space-y-3">
            <label className="block text-slate-300 text-sm font-semibold">Recipients</label>

            {recipients.map((recipient, index) => (
              <div key={index} className="flex gap-2">
                {/* Address Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={recipient.address}
                    onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                    placeholder="G..."
                    className={`w-full px-3 py-2 bg-slate-700 text-white placeholder-slate-500 rounded-lg border ${
                      errors[index] ? 'border-red-500' : 'border-slate-600'
                    } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm`}
                    disabled={loading}
                  />
                </div>

                {/* Amount Input */}
                <div className="w-24">
                  <input
                    type="number"
                    value={recipient.amount}
                    onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    step="0.0000001"
                    min="0"
                    className={`w-full px-3 py-2 bg-slate-700 text-white placeholder-slate-500 rounded-lg border ${
                      errors[index] ? 'border-red-500' : 'border-slate-600'
                    } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm`}
                    disabled={loading}
                  />
                </div>

                {/* Remove Button */}
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(index)}
                    disabled={loading}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove recipient"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {/* Error message for recipient */}
            {Object.entries(errors).map(([index, message]) => (
              <p key={`error-${index}`} className="text-red-400 text-xs ml-1">
                Recipient {parseInt(index) + 1}: {message}
              </p>
            ))}
          </div>

          {/* Add Recipient Button */}
          {recipients.length < 100 && (
            <button
              type="button"
              onClick={addRecipient}
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-slate-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Recipient
            </button>
          )}

          {/* Memo Input (Optional) */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Memo (Optional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Payment for..."
              maxLength="28"
              className="w-full px-4 py-3 bg-slate-700 text-white placeholder-slate-500 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
              disabled={loading}
            />
            <p className="text-slate-500 text-xs mt-1">{memo.length}/28 characters</p>
          </div>

          {/* Summary Card */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Total Recipients:</span>
              <span className="text-blue-400 font-semibold">{recipients.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-slate-400">Total Amount:</span>
              <span className="text-green-400 font-semibold">{calculateTotalAmount(recipients).toFixed(7)} XLM</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || recipients.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 mt-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send to {recipients.length} Recipient{recipients.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </form>

        {/* Security Warning */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-200/90 text-xs">
            ⚠️ <strong>Double-check</strong> all recipient addresses. Transactions are irreversible!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SendXLM;
