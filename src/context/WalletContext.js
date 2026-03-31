import React, { createContext, useContext, useState, useEffect } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [kit, setKit] = useState(null);
  const [connectedWallets, setConnectedWallets] = useState([]);
  const [activeWallet, setActiveWallet] = useState(null);

  useEffect(() => {
    // Initialize StellarWalletsKit
    const initKit = async () => {
      try {
        const walletKit = new StellarWalletsKit({
          network: 'TESTNET',
        });
        setKit(walletKit);
      } catch (error) {
        console.error('Failed to initialize kit:', error);
      }
    };
    initKit();
  }, []);

  const connectWallet = async (walletType) => {
    if (!kit) {
      throw new Error('Wallet kit not initialized');
    }
    try {
      const result = await kit.connect(walletType);
      if (result) {
        setConnectedWallets(prev => [...prev, result]);
        if (!activeWallet) {
          setActiveWallet(result);
        }
        return result;
      }
    } catch (error) {
      throw new Error(`Failed to connect ${walletType}: ${error.message}`);
    }
  };

  const disconnectWallet = (walletId) => {
    setConnectedWallets(prev => prev.filter(w => w.id !== walletId));
    if (activeWallet?.id === walletId) {
      setActiveWallet(connectedWallets[0] || null);
    }
  };

  const switchWallet = (walletId) => {
    const wallet = connectedWallets.find(w => w.id === walletId);
    if (wallet) {
      setActiveWallet(wallet);
    }
  };

  const value = {
    kit,
    connectedWallets,
    activeWallet,
    connectWallet,
    disconnectWallet,
    switchWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
};
