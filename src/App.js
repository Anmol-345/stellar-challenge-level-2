
import React, { useState } from 'react';
import { WalletProvider, useWalletContext } from './context/WalletContext';
import WalletManager from './components/WalletManager';
import WalletCard from './components/WalletCard';
import SendXLM from './components/SendXLM';
import History from './components/History';
import './App.css';

function AppContent() {
  const { connectedWallets, activeWallet, disconnectWallet, switchWallet } = useWalletContext();
  const [showSend, setShowSend] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleWalletsChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRemoveWallet = (wallet) => {
    disconnectWallet(wallet.id);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      {/* Landing View */}
      {connectedWallets.length === 0 && (
        <div className="flex flex-col items-center justify-center h-screen w-full">
          <h1 className="text-5xl font-bold text-white mb-4 animate-fade-in">Stellar Dapp</h1>
          <p className="text-slate-400 text-lg mb-12">Connect your wallet</p>
          <div className="w-full max-w-md px-6">
            <WalletManager onWalletsChange={handleWalletsChange} />
          </div>
        </div>
      )}

      {/* Multi-Wallet View */}
      {connectedWallets.length > 0 && (
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Stellar Dapp</h1>
            <p className="text-slate-400">
              {connectedWallets.length} wallet{connectedWallets.length !== 1 ? 's' : ''} connected
            </p>
          </div>

          {/* Wallet Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {connectedWallets.map((wallet) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                isActive={activeWallet?.id === wallet.id}
                onActivate={() => switchWallet(wallet.id)}
                onRemove={() => handleRemoveWallet(wallet)}
              />
            ))}
          </div>

          {/* Add More Wallets Button */}
          {connectedWallets.length < 3 && (
            <div className="mb-8 w-full md:max-w-sm">
              <WalletManager onWalletsChange={handleWalletsChange} />
            </div>
          )}

          {/* Active Wallet Actions */}
          {activeWallet && (
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-slate-700 p-8 w-full">
              <h2 className="text-2xl font-bold text-white mb-6">
                Active Wallet: <span className="text-blue-400 capitalize">{activeWallet.type}</span>
              </h2>

              {/* Action Buttons */}
              <div className="flex gap-4 flex-wrap">
                <button
                  onClick={() => setShowSend(true)}
                  className="flex-1 min-w-max bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send XLM
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex-1 min-w-max bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Modal */}
      {showSend && activeWallet && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSend(false)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <SendXLM publicKey={activeWallet.publicKey} onBack={() => setShowSend(false)} />
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && activeWallet && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHistory(false)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <History publicKey={activeWallet.publicKey} onBack={() => setShowHistory(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;
