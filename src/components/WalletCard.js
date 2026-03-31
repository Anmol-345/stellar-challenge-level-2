import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { QRCodeSVG } from 'qrcode.react';
import * as StellarSdk from '@stellar/stellar-sdk';

const Server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

const WalletCard = ({ wallet, isActive, onActivate, onRemove }) => {
  const [balance, setBalance] = useState(wallet.balance || '0');
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (wallet.publicKey) {
      const fetchBalance = async () => {
        try {
          const account = await Server.loadAccount(wallet.publicKey);
          const xlm = account.balances.find(b => b.asset_type === 'native');
          setBalance(xlm?.balance || '0');
        } catch (error) {
          console.error('Failed to fetch balance:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchBalance();
    }
  }, [wallet.publicKey]);

  return (
    <>
      <div
        onClick={onActivate}
        className={`w-full border-2 rounded-xl p-4 cursor-pointer transition-all ${
          isActive
            ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
            : 'border-slate-600 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 capitalize">
                {wallet.type}
              </span>
              {isActive && (
                <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 text-green-400 text-xs rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-slate-300 my-2 break-all cursor-pointer hover:text-blue-400">
              {wallet.publicKey}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-yellow-400">
                {loading ? '...' : balance}
              </span>
              <span className="text-sm text-slate-400">XLM</span>
            </div>
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <CopyToClipboard text={wallet.publicKey} onCopy={() => setCopied(true)}>
              <button
                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition"
                title="Copy address"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </CopyToClipboard>
            <button
              onClick={() => setShowQR(true)}
              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition"
              title="Show QR code"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6.364 1.636l-.707.707M20 12h-1M17.636 17.636l-.707-.707M12 20v-1M6.364 17.636l.707-.707M4 12h1M6.364 6.364l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
            <button
              onClick={onRemove}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition"
              title="Remove wallet"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {copied && <p className="text-green-400 text-xs mt-2">✓ Copied!</p>}
      </div>

      {/* QR Modal */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold">Wallet QR Code</h3>
              <button
                onClick={() => setShowQR(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <QRCodeSVG value={wallet.publicKey} size={300} className="border-4 border-slate-700 rounded-lg" />
              <p className="text-slate-400 text-sm mt-4 text-center font-mono break-all">{wallet.publicKey}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletCard;
