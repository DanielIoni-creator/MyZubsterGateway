const jwt = require('jsonwebtoken');
const User = require('../models/User');

const refreshTokens = new Map(); // In produzione: Redis

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  refreshTokens.set(refreshToken, user._id);
  return { accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken) => {
  const userId = refreshTokens.get(refreshToken);
  if (!userId) throw new Error('Invalid refresh token');
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  return generateTokens(user);
};

module.exports = { generateTokens, refreshAccessToken };
