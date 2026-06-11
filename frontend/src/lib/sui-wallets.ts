import {
  isSuiChain,
  isWalletWithRequiredFeatureSet,
  SuiSignAndExecuteTransaction,
  SuiSignTransaction,
  type WalletWithRequiredFeatures,
} from "@mysten/wallet-standard";

/** Wallets that register in the browser but do not reliably support Sui. */
const BLOCKED_WALLET_NAMES = new Set(["phantom", "metamask", "coinbase wallet"]);

export function isConnectableSuiWallet(
  wallet: WalletWithRequiredFeatures
): boolean {
  const name = wallet.name.trim().toLowerCase();
  if (BLOCKED_WALLET_NAMES.has(name)) {
    return false;
  }

  const supportsSuiChain = wallet.chains.some(isSuiChain);
  if (!supportsSuiChain) {
    return false;
  }

  return (
    isWalletWithRequiredFeatureSet(wallet, [SuiSignTransaction]) ||
    isWalletWithRequiredFeatureSet(wallet, [SuiSignAndExecuteTransaction])
  );
}

export function filterConnectableSuiWallets(
  wallets: WalletWithRequiredFeatures[]
): WalletWithRequiredFeatures[] {
  return wallets.filter(isConnectableSuiWallet);
}
