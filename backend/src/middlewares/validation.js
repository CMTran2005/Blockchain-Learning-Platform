/**
 * Input validation middleware
 */

/**
 * Validate Ethereum address
 */
const validateEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate transaction hash
 */
const validateTransactionHash = (hash) => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

/**
 * Sanitize input string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, 1000); // Limit to 1000 chars
};

/**
 * Validate course data before creation/update
 */
const validateCourseInput = (req, res, next) => {
  const { title, price, category } = req.body;

  const errors = [];

  if (title && typeof title === 'string') {
    if (title.trim().length === 0) {
      errors.push('Title cannot be empty');
    }
    if (title.length > 500) {
      errors.push('Title must be less than 500 characters');
    }
  }

  if (price !== undefined && typeof price !== 'number') {
    errors.push('Price must be a number');
  }

  if (category && typeof category !== 'string') {
    errors.push('Category must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validate user data before creation/update
 */
const validateUserInput = (req, res, next) => {
  const { walletAddress, email } = req.body;

  const errors = [];

  if (walletAddress && !validateEthereumAddress(walletAddress)) {
    errors.push('Invalid wallet address format');
  }

  if (email && !validateEmail(email)) {
    errors.push('Invalid email format');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validate enrollment data
 */
const validateEnrollmentInput = (req, res, next) => {
  const { tx_hash, walletAddress, courseId } = req.body;

  const errors = [];

  if (tx_hash && !validateTransactionHash(tx_hash)) {
    errors.push('Invalid transaction hash format');
  }

  if (walletAddress && !validateEthereumAddress(walletAddress)) {
    errors.push('Invalid wallet address format');
  }

  if (courseId && typeof courseId !== 'string') {
    errors.push('Course ID must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

module.exports = {
  validateEthereumAddress,
  validateEmail,
  validateTransactionHash,
  sanitizeString,
  validateCourseInput,
  validateUserInput,
  validateEnrollmentInput
};
