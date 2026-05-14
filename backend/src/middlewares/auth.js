/**
 * Authentication middleware
 * Verify wallet signature or JWT token
 */

const verifyWalletAddress = (req, res, next) => {
  try {
    // Get wallet address from params or body
    const walletAddress = req.params.walletAddress || req.body.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ message: 'Invalid wallet address format' });
    }

    // Attach to request object
    req.user = {
      walletAddress: walletAddress.toLowerCase()
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

/**
 * Verify admin role (for protected routes)
 */
const verifyAdmin = (req, res, next) => {
  try {
    // In production, you would check JWT token or database for admin role
    // For now, this is a placeholder
    
    const adminAddresses = process.env.ADMIN_ADDRESSES?.split(',') || [];
    const userWallet = req.user?.walletAddress;

    if (!adminAddresses.includes(userWallet?.toLowerCase())) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Authorization failed', error: error.message });
  }
};

module.exports = { verifyWalletAddress, verifyAdmin };
