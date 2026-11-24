import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  isHex,
  parseAbi,
  parseEther,
  size,
  zeroAddress,
  type Address,
  type EIP1193Provider,
  type Hex,
} from 'viem';
import { sepolia } from 'viem/chains';

// Hyperlane registry: deployments/warp_routes/ETH/aleotestnet-config.yaml.
export const SEPOLIA_ETH_ROUTER = '0x7c4aAAaB1f846881af95f5736d127F3F3F07F25F';
export const ALEO_TESTNET_DOMAIN = 1617853565;
export const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
export const HYP_NATIVE_ABI = parseAbi([
  'function quoteTransferRemote(uint32 destination, bytes32 recipient, uint256 amount) view returns ((address token, uint256 amount)[])',
  'function transferRemote(uint32 destination, bytes32 recipient, uint256 amount) payable returns (bytes32)',
]);

export type TestnetMintQuote = {
  account: Address;
  router: Address;
  recipient: Hex;
  amount: bigint;
  fee: bigint;
  value: bigint;
};

function clients(provider: EIP1193Provider) {
  const transport = custom(provider, { retryCount: 0 });
  return {
    wallet: createWalletClient({ chain: sepolia, transport }),
    public: createPublicClient({ chain: sepolia, transport }),
  };
}

async function assertAccount(provider: EIP1193Provider, account: Address) {
  const { wallet } = clients(provider);
  if ((await wallet.getChainId()) !== sepolia.id) {
    throw new Error('Switch your EVM wallet to Ethereum Sepolia and quote again.');
  }
  const [current] = await wallet.getAddresses();
  if (current?.toLowerCase() !== account.toLowerCase()) {
    throw new Error('The EVM account changed. Request a new quote.');
  }
}

async function nativeValue(provider: EIP1193Provider, quote: TestnetMintQuote) {
  const fees = await clients(provider).public.readContract({
    address: quote.router,
    abi: HYP_NATIVE_ABI,
    functionName: 'quoteTransferRemote',
    args: [ALEO_TESTNET_DOMAIN, quote.recipient, quote.amount],
    account: quote.account,
  });
  // HypNative quotes include the bridged principal as well as dispatch/router fees.
  if (fees.some(fee => fee.token !== zeroAddress)) {
    throw new Error('This example supports native Sepolia ETH routes only.');
  }
  const value = fees.reduce((total, fee) => total + fee.amount, 0n);
  if (value < quote.amount) throw new Error('The router returned an incomplete ETH quote.');
  return value;
}

export async function quoteTestnetMint(
  provider: EIP1193Provider,
  input: { recipient: string; amountEth: string },
): Promise<TestnetMintQuote> {
  const router = getAddress(SEPOLIA_ETH_ROUTER);
  const recipient = input.recipient.trim();
  if (!isHex(recipient, { strict: true }) || size(recipient) !== 32) {
    throw new Error('Supply a 0x-prefixed, 32-byte address encoding.');
  }
  if (!/^\d+(\.\d{1,18})?$/.test(input.amountEth.trim())) {
    throw new Error('Enter an ETH amount with at most 18 decimal places.');
  }
  const amount = parseEther(input.amountEth.trim());
  if (amount <= 0n) throw new Error('Enter an ETH amount greater than zero.');
  const { wallet } = clients(provider);
  const [account] = await wallet.requestAddresses();
  if (!account) throw new Error('Connect an EVM account.');
  if ((await wallet.getChainId()) !== sepolia.id) {
    try {
      await wallet.switchChain({ id: sepolia.id });
    } catch (error) {
      if ((error as { code?: number }).code !== 4902) throw error;
      await wallet.addChain({ chain: sepolia });
      await wallet.switchChain({ id: sepolia.id });
    }
  }
  await assertAccount(provider, account);
  const quote = { account, router, recipient, amount, fee: 0n, value: 0n };
  quote.value = await nativeValue(provider, quote);
  quote.fee = quote.value - amount;
  await assertAccount(provider, account);
  return quote;
}

export async function sendTestnetMint(
  provider: EIP1193Provider,
  quote: TestnetMintQuote,
  assertCurrent: () => void = () => {},
): Promise<Hex> {
  const client = clients(provider);
  assertCurrent();
  await assertAccount(provider, quote.account);
  if ((await nativeValue(provider, quote)) !== quote.value) {
    throw new Error('The bridge fee changed. Request a new quote before sending.');
  }
  const { request } = await client.public.simulateContract({
    address: quote.router,
    abi: HYP_NATIVE_ABI,
    functionName: 'transferRemote',
    args: [ALEO_TESTNET_DOMAIN, quote.recipient, quote.amount],
    account: quote.account,
    value: quote.value,
  });
  await assertAccount(provider, quote.account);
  assertCurrent();
  return client.wallet.writeContract(request);
}

// Confirmation stays on Sepolia even if the injected wallet switches networks.
export function waitForTestnetMint(hash: Hex) {
  return createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC),
  }).waitForTransactionReceipt({ hash, timeout: 120_000 });
}
