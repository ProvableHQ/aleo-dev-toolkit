import type { FC, MouseEventHandler } from 'react';
import { WalletReadyState } from '@provablehq/aleo-wallet-standard';
import { Wallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Button } from './Button';
import { WalletIcon } from './WalletIcon';

export interface WalletListItemProps {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  tabIndex?: number;
  wallet: Wallet;
}

export const WalletListItem: FC<WalletListItemProps> = ({ handleClick, tabIndex, wallet }) => {
  return (
    <li>
      <Button onClick={handleClick} startIcon={<WalletIcon wallet={wallet} />} tabIndex={tabIndex}>
        {wallet.adapter.name}
        {wallet.readyState === WalletReadyState.INSTALLED && <span>Installed</span>}
      </Button>
    </li>
  );
};
