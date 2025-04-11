import React, { FC, useCallback, useMemo } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

/**
 * Wallet button props
 */
export interface WalletMultiButtonProps {
  /**
   * Optional class name
   */
  className?: string;
  
  /**
   * Button style
   */
  style?: React.CSSProperties;
}

/**
 * Wallet multi-button component
 */
export const WalletMultiButton: FC<WalletMultiButtonProps> = ({
  className = '',
  style,
}) => {
  const { wallet, account, connect, disconnect, connecting, readyState } = useWallet();
  
  const shortAddress = useMemo(() => {
    if (!account) return '';
    const address = account.address;
    
    if (!address) {
      return '';
    }
    
    if (address.length <= 8) {
      return address;
    }
    
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [account]);
  
  const handleClick = useCallback(async () => {
    if (readyState === 'connected') {
      await disconnect();
    } else if (readyState === 'ready') {
      await connect();
    }
  }, [readyState, connect, disconnect]);
  
  const buttonText = useMemo(() => {
    if (connecting) {
      return 'Connecting...';
    }
    
    if (readyState === 'connected') {
      return shortAddress;
    }
    
    if (readyState === 'ready') {
      return 'Connect Wallet';
    }
    
    return 'No Wallet Available';
  }, [connecting, readyState, shortAddress]);
  
  return (
    <button
      className={`aleo-wallet-button ${className}`}
      onClick={handleClick}
      disabled={connecting || (readyState !== 'connected' && readyState !== 'ready')}
      style={{
        backgroundColor: '#222',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minWidth: '120px',
        ...style,
      }}
    >
      {wallet && wallet.icon && (
        <img
          src={wallet.icon}
          alt={`${wallet.name} icon`}
          style={{ width: '20px', height: '20px', borderRadius: '50%' }}
        />
      )}
      {buttonText}
    </button>
  );
}; 