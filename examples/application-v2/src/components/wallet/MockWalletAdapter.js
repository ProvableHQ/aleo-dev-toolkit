import { WalletReadyState, WalletDecryptPermission, ALEO_CHAINS } from '@provablehq/aleo-wallet-standard';
import EventEmitter from 'eventemitter3';

export class MockWalletAdapter extends EventEmitter {
  constructor() {
    super();
    this.name = 'Mock Aleo Wallet';
    this.url = '';
    this.icon = '';
    this.readyState = WalletReadyState.LOADABLE;
    this.account = null;
    this.chains = [ALEO_CHAINS.TESTNET3];
    this.connected = false;
    this.network = 'testnet3';
    this.decryptPermission = WalletDecryptPermission.NoDecrypt;
  }

  async connect(network, decryptPermission, programs = []) {
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a mock Aleo address
    const mockAddress = 'aleo1' + Array.from({ length: 59 }, () => 
      Math.random().toString(36)[2] || '0'
    ).join('');
    
    this.account = {
      address: mockAddress,
      publicKey: mockAddress.replace('aleo1', 'aleo_pk_'),
    };
    this.connected = true;
    this.network = network;
    this.decryptPermission = decryptPermission;
    
    this.emit('connect', this.account);
    return this.account;
  }

  async disconnect() {
    this.account = null;
    this.connected = false;
    this.emit('disconnect');
  }

  async executeTransaction(options) {
    throw new Error('Transaction execution not implemented in mock wallet');
  }

  async signMessage(message) {
    throw new Error('Message signing not implemented in mock wallet');
  }

  async switchNetwork(network) {
    this.network = network;
    this.emit('networkChange', network);
  }

  async decrypt(cipherText) {
    throw new Error('Decryption not implemented in mock wallet');
  }

  async requestRecords(program, includePlaintext = false) {
    throw new Error('Record requests not implemented in mock wallet');
  }
}