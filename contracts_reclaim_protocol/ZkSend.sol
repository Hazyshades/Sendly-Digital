// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Reclaim} from "./Reclaim.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVaultManager {
    function depositToVault(address token, uint256 amount) external returns (uint256 shares);
    function withdrawFromVault(address token, uint256 amount, address to) external returns (uint256 shares);
}

/**
 * @notice Using Reclaim Protocol SDK for proof verification
 * @dev Import Reclaim.sol from local contracts directory
 */

/**
 * @title zkSEND - Direct payment to social usernames using zkTLS
 * @notice Allows sending tokens directly to social usernames without NFTs
 * @dev Uses zkTLS proofs to verify ownership of social accounts
 */
contract ZkSend is Ownable, ReentrancyGuard {
    // Supported tokens
    IERC20 public usdcToken;
    IERC20 public eurcToken;
    
    // zkTLS Verifier contract address
    address public verifierContract;

    // Fee recipient (if set; otherwise fees go to owner)
    address public feeRecipient;

    // Vault manager for ERC-4626 deposits/withdrawals
    address public vaultManager;

    // Fee: 0.1% in basis points (10 / 10_000)
    uint256 public constant FEE_BPS = 10;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // Payment structure
    struct Payment {
        uint256 paymentId;
        address sender;
        bytes32 socialIdentityHash; // keccak256(platform:username)
        string platform; // "twitter", "telegram", etc.
        uint256 amount; // amount recipient receives on claim (sender paid amount + fee)
        address token;
        address recipient; // Set when claimed
        bool claimed;
        uint256 createdAt;
        uint256 claimedAt;
    }
    
    // Mapping: paymentId => Payment
    mapping(uint256 => Payment) public payments;
    
    // Mapping: socialIdentityHash => paymentIds[]
    mapping(bytes32 => uint256[]) public paymentsByIdentity;
    
    // Counter for payment IDs
    uint256 private nextPaymentId = 1;
    
    // Events
    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed sender,
        bytes32 indexed socialIdentityHash,
        string platform,
        uint256 amount,
        address token
    );
    
    event PaymentClaimed(
        uint256 indexed paymentId,
        address indexed recipient,
        bytes32 indexed socialIdentityHash,
        uint256 amount,
        address token
    );
    
    event VerifierContractUpdated(address indexed oldVerifier, address indexed newVerifier);

    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    event FeePaid(
        uint256 indexed paymentId,
        address indexed sender,
        address indexed feeRecipient,
        uint256 feeAmount,
        address token
    );

    event VaultManagerUpdated(address indexed oldManager, address indexed newManager);
    event VaultDeposit(address indexed token, uint256 amount);

    /**
     * @notice Constructor
     * @param _usdcAddress USDC token address
     * @param _eurcAddress EURC token address
     * @param _verifierAddress zkTLS Verifier contract address
     */
    constructor(
        address _usdcAddress,
        address _eurcAddress,
        address _verifierAddress
    ) Ownable(msg.sender) {
        require(_usdcAddress != address(0), "USDC address required");
        require(_eurcAddress != address(0), "EURC address required");
        require(_verifierAddress != address(0), "Verifier address required");
        
        usdcToken = IERC20(_usdcAddress);
        eurcToken = IERC20(_eurcAddress);
        verifierContract = _verifierAddress;
    }

    /**
     * @notice Calculate 0.1% fee on amount (paid by sender, sent to owner).
     */
    function _calculateFee(uint256 _amount) internal pure returns (uint256) {
        return (_amount * FEE_BPS) / BPS_DENOMINATOR;
    }

    function _ensureLiquidity(address _token, uint256 _amount) internal {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance >= _amount) {
            return;
        }

        uint256 shortfall = _amount - balance;
        require(vaultManager != address(0), "Vault manager not set");
        IVaultManager(vaultManager).withdrawFromVault(_token, shortfall, address(this));

        require(
            IERC20(_token).balanceOf(address(this)) >= _amount,
            "Insufficient liquidity"
        );
    }

    /**
     * @notice Create a payment to a social username.
     * Sender pays amount + 0.1% fee; recipient receives full amount on claim. Fee goes to owner.
     * @param _socialIdentityHash Hash of platform:username (keccak256("platform:username"))
     * @param _platform Platform name (e.g., "twitter", "telegram")
     * @param _amount Amount of tokens the recipient will receive (fee is extra, paid by sender)
     * @param _token Token address (USDC or EURC)
     * @return paymentId The ID of the created payment
     */
    function createPayment(
        bytes32 _socialIdentityHash,
        string memory _platform,
        uint256 _amount,
        address _token
    ) external returns (uint256) {
        require(_socialIdentityHash != bytes32(0), "Invalid identity hash");
        require(bytes(_platform).length > 0, "Platform required");
        require(_amount > 0, "Amount must be > 0");
        require(
            _token == address(usdcToken) || _token == address(eurcToken),
            "Unsupported token"
        );

        uint256 fee = _calculateFee(_amount);
        uint256 totalFromSender = _amount + fee;

        // Transfer amount + fee from sender to contract
        require(
            IERC20(_token).transferFrom(msg.sender, address(this), totalFromSender),
            "Transfer failed"
        );

        // Send fee to feeRecipient or owner
        if (fee > 0) {
            address recipient = feeRecipient != address(0) ? feeRecipient : owner();
            require(
                IERC20(_token).transfer(recipient, fee),
                "Fee transfer failed"
            );
        }

        // Create payment (amount = what recipient receives)
        uint256 paymentId = nextPaymentId++;
        payments[paymentId] = Payment({
            paymentId: paymentId,
            sender: msg.sender,
            socialIdentityHash: _socialIdentityHash,
            platform: _platform,
            amount: _amount,
            token: _token,
            recipient: address(0),
            claimed: false,
            createdAt: block.timestamp,
            claimedAt: 0
        });

        // Add to identity mapping
        paymentsByIdentity[_socialIdentityHash].push(paymentId);

        emit PaymentCreated(
            paymentId,
            msg.sender,
            _socialIdentityHash,
            _platform,
            _amount,
            _token
        );
        if (fee > 0) {
            address recipient = feeRecipient != address(0) ? feeRecipient : owner();
            emit FeePaid(paymentId, msg.sender, recipient, fee, _token);
        }

        return paymentId;
    }
    
    /**
     * @notice Claim a payment using Reclaim Protocol proof
     * @param _paymentId The payment ID to claim
     * @param _proof Reclaim Protocol proof structure
     * @param _recipient Wallet address to receive the tokens
     */
    function claimPayment(
        uint256 _paymentId,
        Reclaim.Proof memory _proof,
        address _recipient
    ) external nonReentrant {
        Payment storage payment = payments[_paymentId];
        require(payment.paymentId != 0, "Payment not found");
        require(!payment.claimed, "Payment already claimed");
        require(_recipient != address(0), "Invalid recipient");
        
        // Verify Reclaim Protocol proof
        // The verifier contract verifies:
        // 1. Proof is cryptographically valid
        // 2. Proof was generated by Reclaim Protocol
        // 3. Additional context verification (platform:username)
        bool verified = verifyZkTLSProof(_proof, payment.socialIdentityHash, _recipient);
        
        require(verified, "Proof verification failed");
        
        // Mark as claimed
        payment.claimed = true;
        payment.recipient = _recipient;
        payment.claimedAt = block.timestamp;
        
        // Transfer tokens to recipient
        _ensureLiquidity(payment.token, payment.amount);
        require(
            IERC20(payment.token).transfer(_recipient, payment.amount),
            "Transfer to recipient failed"
        );
        
        emit PaymentClaimed(
            _paymentId,
            _recipient,
            payment.socialIdentityHash,
            payment.amount,
            payment.token
        );
    }

    /**
     * @notice Claim multiple payments in one transaction using a single Reclaim proof
     * @dev All payments must belong to the same social identity (same socialIdentityHash).
     *      Proof is verified once; then all listed payments are transferred to recipient.
     * @param _paymentIds Array of payment IDs to claim (e.g. [2, 5, 10])
     * @param _proof Reclaim Protocol proof (same proof used for all payments)
     * @param _recipient Wallet address to receive the tokens
     */
    function claimPayments(
        uint256[] calldata _paymentIds,
        Reclaim.Proof memory _proof,
        address _recipient
    ) external nonReentrant {
        require(_paymentIds.length > 0, "No payments");
        require(_recipient != address(0), "Invalid recipient");

        Payment storage first = payments[_paymentIds[0]];
        require(first.paymentId != 0, "Payment not found");
        require(!first.claimed, "Payment already claimed");
        bytes32 identityHash = first.socialIdentityHash;

        // Verify proof once for this identity
        bool verified = verifyZkTLSProof(_proof, identityHash, _recipient);
        require(verified, "Proof verification failed");

        for (uint256 i = 0; i < _paymentIds.length; i++) {
            uint256 pid = _paymentIds[i];
            Payment storage payment = payments[pid];
            require(payment.paymentId != 0, "Payment not found");
            require(!payment.claimed, "Payment already claimed");
            require(payment.socialIdentityHash == identityHash, "Identity mismatch");

            payment.claimed = true;
            payment.recipient = _recipient;
            payment.claimedAt = block.timestamp;

            _ensureLiquidity(payment.token, payment.amount);
            require(
                IERC20(payment.token).transfer(_recipient, payment.amount),
                "Transfer to recipient failed"
            );

            emit PaymentClaimed(
                pid,
                _recipient,
                payment.socialIdentityHash,
                payment.amount,
                payment.token
            );
        }
    }

    /**
     * @notice Verify zkTLS proof using Reclaim Protocol Verifier
     * @dev Calls the Reclaim Protocol Verifier contract to verify the proof
     * @param _proof The Reclaim Protocol proof structure
     * @param _expectedIdentityHash Expected social identity hash (keccak256("platform:username"))
     * @return verified Whether the proof is valid
     */
    function verifyZkTLSProof(
        Reclaim.Proof memory _proof,
        bytes32 _expectedIdentityHash,
        address _recipient
    ) internal returns (bool) {
        require(verifierContract != address(0), "Verifier not configured");
        require(_expectedIdentityHash != bytes32(0), "Invalid identity hash");
        // Prefer contextAddress (set by backend) to bind proof to recipient.
        // Fallback to proof owner for backward compatibility.
        string memory contextAddressStr = Reclaim(verifierContract).extractFieldFromContext(
            _proof.claimInfo.context,
            "contextAddress\":\""
        );
        if (bytes(contextAddressStr).length > 0) {
            address contextAddress = parseAddress(contextAddressStr);
            require(contextAddress == _recipient, "Recipient mismatch");
        } else {
            require(_proof.signedClaim.claim.owner == _recipient, "Recipient mismatch");
        }

        // Verify proof using Reclaim Protocol Verifier contract
        Reclaim(verifierContract).verifyProof(_proof);

        // Extract identity string from context and compare hash
        string memory contextValue = _proof.claimInfo.context;
        string memory extracted = Reclaim(verifierContract).extractFieldFromContext(
            contextValue,
            "contextMessage\":\""
        );
        string memory identity = bytes(extracted).length > 0 ? extracted : contextValue;
        require(bytes(identity).length > 0, "Missing identity context");

        bytes32 actualHash = keccak256(abi.encodePacked(identity));
        require(actualHash == _expectedIdentityHash, "Identity mismatch");

        return true;
    }
    
    /**
     * @notice Get all pending payment IDs for a social identity
     * @param _socialIdentityHash Hash of platform:username
     * @return pendingPaymentIds Array of pending payment IDs
     */
    function getPendingPayments(bytes32 _socialIdentityHash)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory allPaymentIds = paymentsByIdentity[_socialIdentityHash];
        uint256 pendingCount = 0;
        
        // Count pending payments
        for (uint256 i = 0; i < allPaymentIds.length; i++) {
            if (!payments[allPaymentIds[i]].claimed) {
                pendingCount++;
            }
        }
        
        // Build array of pending payments
        uint256[] memory pendingPaymentIds = new uint256[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allPaymentIds.length; i++) {
            if (!payments[allPaymentIds[i]].claimed) {
                pendingPaymentIds[index] = allPaymentIds[i];
                index++;
            }
        }
        
        return pendingPaymentIds;
    }
    
    /**
     * @notice Get payment details
     * @param _paymentId Payment ID
     * @return payment Payment struct
     */
    function getPayment(uint256 _paymentId)
        external
        view
        returns (Payment memory)
    {
        return payments[_paymentId];
    }
    
    /**
     * @notice Update verifier contract address (only owner)
     * @param _newVerifier New verifier contract address
     */
    function setVerifierContract(address _newVerifier) external onlyOwner {
        require(_newVerifier != address(0), "Invalid verifier address");
        address oldVerifier = verifierContract;
        verifierContract = _newVerifier;
        emit VerifierContractUpdated(oldVerifier, _newVerifier);
    }

    /**
     * @notice Set or update fee recipient address (only owner).
     * @param _feeRecipient New fee recipient; use address(0) to send fees to owner again.
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }

    /**
     * @notice Update vault manager address (only owner)
     * @param _manager New vault manager address
     */
    function setVaultManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Invalid vault manager");
        address oldManager = vaultManager;
        vaultManager = _manager;
        emit VaultManagerUpdated(oldManager, _manager);
    }

    /**
     * @notice Deposit contract funds into the configured vault manager (only owner)
     * @param _token Token address (USDC or EURC)
     * @param _amount Amount to deposit
     */
    function depositToVault(address _token, uint256 _amount) external onlyOwner {
        require(vaultManager != address(0), "Vault manager not set");
        require(_amount > 0, "Amount must be > 0");
        require(
            _token == address(usdcToken) || _token == address(eurcToken),
            "Unsupported token"
        );

        IERC20(_token).approve(vaultManager, _amount);
        IVaultManager(vaultManager).depositToVault(_token, _amount);
        emit VaultDeposit(_token, _amount);
    }
    
    /**
     * @notice Parse hex string address (0x...) into address type.
     * @dev Reverts on invalid length or non-hex characters.
     */
    function parseAddress(string memory _addressString) internal pure returns (address) {
        bytes memory b = bytes(_addressString);
        require(b.length == 42, "Invalid address length");
        require(b[0] == '0' && (b[1] == 'x' || b[1] == 'X'), "Invalid address prefix");

        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            result = (result << 4) | uint160(fromHexChar(uint8(b[i])));
        }
        return address(result);
    }

    /**
     * @notice Convert a single hex character to its value.
     */
    function fromHexChar(uint8 c) internal pure returns (uint8) {
        if (c >= 48 && c <= 57) {
            return c - 48;
        }
        if (c >= 65 && c <= 70) {
            return c - 55;
        }
        if (c >= 97 && c <= 102) {
            return c - 87;
        }
        revert("Invalid hex character");
    }

    /**
     * @notice Emergency withdraw (only owner)
     * @param _token Token address
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount)
        external
        onlyOwner
    {
        require(
            IERC20(_token).transfer(owner(), _amount),
            "Emergency withdraw failed"
        );
    }
}

