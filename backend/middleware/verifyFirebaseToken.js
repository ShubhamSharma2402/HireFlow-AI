/**
 * Firebase Token Verification Middleware
 * Verifies Firebase ID token from Authorization header
 * Falls back to dev mode if Firebase Admin SDK not initialized
 */
const firebaseAdmin = require('../config/firebase');

const verifyFirebaseToken = async (req, res, next) => {
  // Dev/guest mode — Firebase service account not configured
  if (!firebaseAdmin) {
    console.warn('[Auth] Firebase not initialized — dev/guest mode active');
    req.firebaseUser = {
      uid: `guest_${Date.now()}`,
      email: 'dev@hireflow.ai',
      name: 'Dev User',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No auth token provided. Include Authorization: Bearer <token>',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await firebaseAdmin.auth.verifyIdToken(idToken);
    req.firebaseUser = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || decoded.email || 'User',
    };
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
    });
  }
};

module.exports = verifyFirebaseToken;
