/**
 * Admin Authentication Middleware
 * Kiểm tra wallet address có quyền admin hay không.
 * 
 * Admin addresses được cấu hình trong .env:
 *   ADMIN_ADDRESSES=0xAddr1,0xAddr2
 *
 * Frontend gửi header: x-wallet-address: 0x...
 */

const getAdminAddresses = () => {
  const raw = process.env.ADMIN_ADDRESSES || '';
  return raw.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
};

const adminAuth = (req, res, next) => {
  const walletAddress = req.headers['x-wallet-address'];

  if (!walletAddress) {
    return res.status(401).json({ message: 'Missing wallet address header (x-wallet-address)' });
  }

  const admins = getAdminAddresses();

  if (admins.length === 0) {
    // No admin list configured — allow in dev mode
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  No ADMIN_ADDRESSES configured, allowing request in dev mode');
      req.user = { walletAddress: walletAddress.toLowerCase(), role: 'admin' };
      return next();
    }
    return res.status(403).json({ message: 'Admin access not configured' });
  }

  if (!admins.includes(walletAddress.toLowerCase())) {
    return res.status(403).json({ message: 'Access denied: not an admin wallet' });
  }

  req.user = { walletAddress: walletAddress.toLowerCase(), role: 'admin' };
  next();
};

module.exports = adminAuth;
