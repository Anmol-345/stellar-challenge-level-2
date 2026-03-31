import React, { useState } from 'react';
import { useWalletContext } from '../context/WalletContext';
import * as StellarSdk from '@stellar/stellar-sdk';

const Server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

const WALLET_TYPES = [
  { id: 'freighter', name: 'Freighter', icon: '🔷' },
  { id: 'albedo', name: 'Albedo', icon: '🟠' },
  { id: 'xbull', name: 'XBULL', icon: '🔵' },
  { id: 'lobstr', name: 'Lobstr', icon: '📱' },
];

const WalletManager = ({ onWalletsChange }) => {
  const { connectWallet, connectedWallets } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('freighter');

  const handleConnect = async () => {
    if (connectedWallets.length >= 3) {
      alert('Maximum 3 wallets can be connected');
      return;
    }

    setLoading(true);
    try {
      const wallet = await connectWallet(selectedWallet);
      
      // Fetch balance
      const account = await Server.loadAccount(wallet.publicKey);
      const xlm = account.balances.find(b => b.asset_type === 'native');
      wallet.balance = xlm?.balance || '0';
      
      onWalletsChange?.();
    } catch (error) {
      alert(`Connection Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <select
          value={selectedWallet}
          onChange={(e) => setSelectedWallet(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-slate-800 text-white border border-slate-700 rounded-lg hover:border-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-60 font-semibold"
        >
          {WALLET_TYPES.map(wallet => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.icon} {wallet.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleConnect}
          disabled={loading || connectedWallets.length >= 3}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition duration-200 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>

      {connectedWallets.length >= 3 && (
        <p className="text-xs text-yellow-400 text-center">Maximum 3 wallets connected</p>
      )}

      <p className="text-xs text-slate-400">
        💡 Select a wallet and connect to add multiple wallets
      </p>
    </div>
  );
};

export default WalletManager;
