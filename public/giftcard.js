const statusMessage = document.getElementById('statusMessage');
const connectBtn = document.getElementById('connectBtn');
const walletAddressInput = document.getElementById('walletAddress');
const redeemBtn = document.getElementById('redeemBtn');
const giftCodeInput = document.getElementById('giftCode');
const contractAddressInput = document.getElementById('contractAddress');
const redeemAmountInput = document.getElementById('redeemAmount');
const bankAccountSelect = document.getElementById('bankAccount');

// Demo-only helper for the Arc Testnet Circle Mint route. Production cash-out
// must use a backend-controlled off-ramp flow with real KYC/account checks.

let provider;
let signer;

function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      showStatus('No wallet found. Please install MetaMask or a compatible wallet.', 'error');
      return;
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    const addr = await signer.getAddress();
    walletAddressInput.value = addr;
    showStatus('Wallet connected', 'success');
  } catch (e) {
    showStatus(e.message || 'Failed to connect wallet', 'error');
  }
}

async function loadBankAccounts() {
  try {
    const response = await fetch('/api/bank-accounts');
    const result = await response.json();
    if (result.success && result.data?.data) {
      const accounts = result.data.data;
      bankAccountSelect.innerHTML = '<option value="">Select bank account</option>';
      accounts.forEach((a, i) => {
        const opt = document.createElement('option');
        opt.value = a.id || i;
        opt.textContent = a.name || `Bank Account ${i + 1}`;
        bankAccountSelect.appendChild(opt);
      });
    } else {
      bankAccountSelect.innerHTML = `
        <option value="demo-account-1">Demo Bank Account 1</option>
        <option value="demo-account-2">Demo Bank Account 2</option>
      `;
    }
  } catch (e) {
    bankAccountSelect.innerHTML = `
      <option value="demo-account-1">Demo Bank Account 1</option>
      <option value="demo-account-2">Demo Bank Account 2</option>
    `;
  }
}

// Minimal placeholder ABI. Replace with the real contract ABI for production.
const PLACEHOLDER_ABI = [
  {
    'inputs': [{ 'internalType': 'uint256', 'name': 'tokenIdOrAmount', 'type': 'uint256' }],
    'name': 'redeem',
    'outputs': [],
    'stateMutability': 'nonpayable',
    'type': 'function'
  }
];

async function redeemOnChain() {
  const address = contractAddressInput.value.trim();
  const codeOrId = giftCodeInput.value.trim();
  if (!signer) {
    showStatus('Connect your wallet first', 'error');
    return null;
  }
  if (!ethers.utils.isAddress(address)) {
    showStatus('Invalid contract address', 'error');
    return null;
  }
  if (!codeOrId) {
    showStatus('Enter gift card code or token id', 'error');
    return null;
  }
  try {
    const contract = new ethers.Contract(address, PLACEHOLDER_ABI, signer);
    const tx = await contract.redeem(ethers.BigNumber.from(codeOrId));
    showStatus(`On-chain redeem submitted: ${tx.hash}`, 'info');
    const receipt = await tx.wait();
    showStatus(`On-chain redeem confirmed in block ${receipt.blockNumber}`, 'success');
    return receipt;
  } catch (e) {
    showStatus(e.reason || e.message || 'Redeem transaction failed', 'error');
    return null;
  }
}

async function cashOutUSD() {
  const amount = parseFloat(redeemAmountInput.value);
  const bankAccountId = bankAccountSelect.value;
  if (!amount || amount <= 0) {
    showStatus('Enter payout amount in USD', 'error');
    return null;
  }
  if (!bankAccountId) {
    showStatus('Select bank account', 'error');
    return null;
  }
  try {
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: 'USD',
        bankAccountId
      })
    });
    const out = await res.json();
    if (out.success) {
      showStatus(`Circle redemption created. Tracking id: ${out.data?.data?.id || 'N/A'}`, 'success');
      return out;
    }
    showStatus(out.error || 'Failed to create redemption', 'error');
    return null;
  } catch (e) {
    showStatus(e.message || 'Redemption request failed', 'error');
    return null;
  }
}

async function redeemFlow() {
  redeemBtn.disabled = true;
  try {
    const onchain = await redeemOnChain();
    if (!onchain) return;
    await cashOutUSD();
  } finally {
    redeemBtn.disabled = false;
  }
}

connectBtn.addEventListener('click', connectWallet);
redeemBtn.addEventListener('click', redeemFlow);
loadBankAccounts();

// Autofill from query parameters
(function initFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tokenId = params.get('tokenId');
    const amount = params.get('amount');
    const autoConnect = params.get('autoConnect');
    if (tokenId) {
      giftCodeInput.value = tokenId;
    }
    if (amount) {
      redeemAmountInput.value = amount;
    }
    if (autoConnect === '1') {
      // attempt wallet auto-connect (MetaMask)
      connectWallet();
    }
  } catch (e) {
    // ignore
  }
})();



