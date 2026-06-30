const DEFAULT_WALLET_NAME = 'Web3 Wallet';

function getInjectedWalletName(): string {
  if (typeof window === 'undefined' || !window.ethereum) {
    return DEFAULT_WALLET_NAME;
  }

  const ethereum = window.ethereum as any;

  if (ethereum.isRabby === true) {
    return 'Rabby Wallet';
  }

  if (ethereum.isMetaMask === true && ethereum.isRabby !== true) {
    return 'MetaMask';
  }

  if (ethereum.isMetaMask === true) {
    return 'MetaMask';
  }
  if (ethereum.isCoinbaseWallet) {
    return 'Coinbase Wallet';
  }
  if (ethereum.isTrust) {
    return 'Trust Wallet';
  }
  if (ethereum.isBraveWallet) {
    return 'Brave Wallet';
  }
  if (ethereum.isTokenPocket) {
    return 'TokenPocket';
  }
  if (ethereum.isImToken) {
    return 'imToken';
  }
  if (ethereum.isOKExWallet) {
    return 'OKX Wallet';
  }
  if (ethereum.isBitKeep) {
    return 'BitKeep';
  }
  if (ethereum.isFrame) {
    return 'Frame';
  }
  if (ethereum.isPhantom) {
    return 'Phantom';
  }
  if (ethereum.isAvalanche) {
    return 'Avalanche Wallet';
  }
  if (ethereum.isZeppelin) {
    return 'Zeppelin';
  }
  if (ethereum.isRainbow) {
    return 'Rainbow Wallet';
  }

  if (ethereum.providerName && !ethereum.isMetaMask && !ethereum.isRabby) {
    const providerName = String(ethereum.providerName).toLowerCase().trim();
    if (providerName === 'rabby' || providerName === 'rabby wallet') {
      return 'Rabby Wallet';
    }
    if (providerName === 'metamask') {
      return 'MetaMask';
    }
  }

  return DEFAULT_WALLET_NAME;
}

export function detectWalletName(connectorName?: string | null): string {
  if (connectorName) {
    const normalizedName = connectorName.toLowerCase();
    if (normalizedName.includes('rabby')) {
      return 'Rabby Wallet';
    }
    if (normalizedName.includes('metamask')) {
      return 'MetaMask';
    }
    if (normalizedName.includes('coinbase')) {
      return 'Coinbase Wallet';
    }
    if (normalizedName.includes('trust')) {
      return 'Trust Wallet';
    }
    if (normalizedName.includes('rainbow')) {
      return 'Rainbow Wallet';
    }

    return connectorName;
  }

  return getInjectedWalletName();
}

export { DEFAULT_WALLET_NAME };
