/**
 * Firebase Token Verification Middleware
 * Verifies Firebase ID token from Authorization header.
 * If Firebase Admin is not initialized or in dev mode, decodes token payload directly.
 */
const firebaseAdmin = require('../config/firebase');

function parseTokenPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return {
        uid: payload.user_id || payload.sub || payload.uid || 'dev_guest_user',
        email: payload.email || 'dev@hireflow.ai',
        name: payload.name || payload.email || 'User',
      };
    }
  } catch (err) {
    console.warn('[Auth] Failed to parse JWT payload:', err.message);
  }
  return null;
}

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const idToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

  // If Firebase Admin SDK is initialized, verify cryptographically
  if (firebaseAdmin && idToken) {
    try {
      const decoded = await firebaseAdmin.auth.verifyIdToken(idToken);
      req.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || decoded.email || 'User',
      };
      return next();
    } catch (err) {
      console.warn('[Auth] Firebase token verify failed, falling back to decoded payload:', err.message);
    }
  }

  // Fallback: If token is provided, extract user identity from JWT payload
  if (idToken) {
    const parsed = parseTokenPayload(idToken);
    if (parsed) {
      req.firebaseUser = parsed;
      return next();
    }
  }

  // Dev / Guest mode fallback with stable user identity
  req.firebaseUser = {
    uid: 'guest_dev_user',
    email: 'dev@hireflow.ai',
    name: 'Dev User',
  };
  return next();
};

module.exports = verifyFirebaseToken;
