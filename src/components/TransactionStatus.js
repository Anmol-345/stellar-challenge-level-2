import React, { useState, useEffect } from 'react';
import { TRANSACTION_STATUS, pollTransactionStatus, clearTransactionTracking } from '../lib/transactionTracker';

/**
 * TransactionStatus Component
 * Displays real-time transaction tracking with status updates and recipient details
 */
const TransactionStatus = ({ 
  transactionHash, 
  recipients, 
  totalAmount,
  senderAddress,
  onClose 
}) => {
  const [status, setStatus] = useState(TRANSACTION_STATUS.SUBMITTED);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  // Start polling on mount
  useEffect(() => {
    if (!transactionHash) return;

    const startPolling = async () => {
      try {
        const result = await pollTransactionStatus(transactionHash, (update) => {
          setStatus(update.status);
          setPollingAttempts(update.pollingAttempts || 0);
        });

        setStatus(result.status);
        setIsPolling(false);
      } catch (error) {
        console.error('Polling error:', error);
        setStatus(TRANSACTION_STATUS.FAILED);
        setIsPolling(false);
      }
    };

    startPolling();
  }, [transactionHash]);

  // Status color and icon mapping
  const getStatusStyles = () => {
    switch (status) {
      case TRANSACTION_STATUS.CONFIRMED:
        return {
          bgColor: 'bg-green-500/20',
          textColor: 'text-green-400',
          borderColor: 'border-green-500/50',
          icon: '✓',
          label: 'Confirmed',
        };
      case TRANSACTION_STATUS.SUBMITTED:
        return {
          bgColor: 'bg-blue-500/20',
          textColor: 'text-blue-400',
          borderColor: 'border-blue-500/50',
          icon: '◐',
          label: 'Submitted',
          isAnimated: true,
        };
      case TRANSACTION_STATUS.PENDING:
        return {
          bgColor: 'bg-gray-500/20',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/50',
          icon: '◯',
          label: 'Pending',
        };
      case TRANSACTION_STATUS.FAILED:
        return {
          bgColor: 'bg-red-500/20',
          textColor: 'text-red-400',
          borderColor: 'border-red-500/50',
          icon: '✕',
          label: 'Failed',
        };
      default:
        return {
          bgColor: 'bg-gray-500/20',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/50',
          icon: '?',
          label: 'Unknown',
        };
    }
  };

  const statusStyles = getStatusStyles();

  // Truncate long strings
  const truncate = (str, length = 15) => {
    if (!str) return '';
    return str.length > length ? `${str.slice(0, length)}...${str.slice(-10)}` : str;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg shadow-xl border border-slate-700 p-8">
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <div className={`${statusStyles.bgColor} border-2 ${statusStyles.borderColor} rounded-full p-4 flex items-center justify-center w-20 h-20`}>
              <span className={`${statusStyles.textColor} text-3xl font-bold ${statusStyles.isAnimated ? 'animate-spin' : ''}`}>
                {statusStyles.icon}
              </span>
            </div>
          </div>

          {/* Status Text */}
          <h2 className={`text-3xl font-bold text-center mb-2 ${statusStyles.textColor}`}>
            {statusStyles.label}
          </h2>

          {/* Status Description */}
          <p className="text-slate-400 text-center mb-6">
            {status === TRANSACTION_STATUS.SUBMITTED && `Finding on ledger... (${pollingAttempts}/40)`}
            {status === TRANSACTION_STATUS.CONFIRMED && 'Successfully confirmed on the network'}
            {status === TRANSACTION_STATUS.PENDING && 'Waiting to be submitted'}
            {status === TRANSACTION_STATUS.FAILED && 'Something went wrong'}
          </p>

          {/* Transaction Hash */}
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6 border border-slate-600">
            <span className="text-slate-400 text-xs uppercase tracking-wider block mb-2">Transaction Hash</span>
            <p className="text-slate-200 font-mono text-xs break-all">{transactionHash}</p>
          </div>

          {/* Recipients Summary */}
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6 border border-slate-600">
            <span className="text-slate-400 text-xs uppercase tracking-wider block mb-3">Recipients</span>
            <div className="space-y-2">
              {recipients.map((recipient, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-slate-300 font-mono">{truncate(recipient.address)}</span>
                  <span className="text-blue-400 font-semibold">{recipient.amount} XLM</span>
                </div>
              ))}
              <div className="border-t border-slate-600 pt-2 mt-2 flex justify-between font-semibold">
                <span className="text-slate-300">Total:</span>
                <span className="text-green-400">{totalAmount} XLM</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-slate-700/30 rounded-lg p-4 mb-6 border border-slate-600 text-xs text-slate-400 space-y-2">
            <div className="flex justify-between">
              <span>From:</span>
              <span className="font-mono text-slate-300">{truncate(senderAddress)}</span>
            </div>
            <div className="flex justify-between">
              <span>Recipients:</span>
              <span className="font-semibold text-slate-300">{recipients.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Timestamp:</span>
              <span className="text-slate-300">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Stellar Expert Link */}
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 inline-flex items-center justify-center gap-2 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Stellar Expert
            </a>

            {/* Close Button - Show when not polling */}
            {!isPolling && (
              <button
                onClick={() => {
                  clearTransactionTracking(transactionHash);
                  onClose?.();
                }}
                className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200"
              >
                Done
              </button>
            )}
          </div>

          {/* Loading indicator */}
          {isPolling && (
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span>Polling for confirmation...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionStatus;
