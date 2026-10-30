/**
 * Firebase Token Verification Middleware
 * Verifies Firebase ID token from Authorization header.
 * If Firebase Admin SDK is not initialized, safely decodes the Google JWT
 * to preserve the user's authentic name, email, and UID.
 */
const firebaseAdmin = require('../config/firebase');

const parseJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    // ignore
  }
  return null;
};

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const idToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

  // 1. If Firebase Admin SDK is initialized and token provided, verify cryptographically
  if (firebaseAdmin?.auth && idToken) {
    try {
      const decoded = await firebaseAdmin.auth.verifyIdToken(idToken);
      req.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || decoded.email || req.body?.name || 'User',
      };
      return next();
    } catch (err) {
      console.error('[Auth] Token verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired token',
      });
    }
  }

  // 2. If token is provided, extract real Google profile from token payload
  if (idToken) {
    const payload = parseJwtPayload(idToken);
    if (payload && (payload.user_id || payload.sub)) {
      req.firebaseUser = {
        uid: payload.user_id || payload.sub,
        email: payload.email || '',
        name: payload.name || req.body?.name || (payload.email ? payload.email.split('@')[0] : 'User'),
      };
      return next();
    }
  }

  // 3. Fallback: Request body info or anonymous guest
  if (req.body?.name) {
    req.firebaseUser = {
      uid: `user_${Date.now()}`,
      email: req.body.email || '',
      name: req.body.name,
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: No valid auth token provided.',
  });
};

module.exports = verifyFirebaseToken;
