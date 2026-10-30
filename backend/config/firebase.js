/**
 * Firebase Admin SDK initialization
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Firebase Console → https://console.firebase.google.com
 * 2. Select project: jobb-8efa6
 * 3. Go to Project Settings → Service Accounts
 * 4. Click "Generate new private key"
 * 5. Either:
 *    - Save as backend/config/firebase-service-account.json (for local dev)
 *    - OR set FIREBASE_SERVICE_ACCOUNT env var with the JSON contents (for Render / cloud deployments)
 */

const { initializeApp, cert, getApps } = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;
let authInstance = null;

function initFirebaseAdmin() {
  if (firebaseApp) {
    return { app: firebaseApp, auth: authInstance };
  }

  // If already initialized (e.g. by another require), return the existing app
  const apps = getApps();
  if (apps.length > 0) {
    firebaseApp = apps[0];
    authInstance = getAuth(firebaseApp);
    return { app: firebaseApp, auth: authInstance };
  }

  // 1. Try FIREBASE_SERVICE_ACCOUNT environment variable (recommended for Render/cloud)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      let serviceAccount;
      if (raw.startsWith('{')) {
        serviceAccount = JSON.parse(raw);
      } else {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || 'jobb-8efa6',
      });
      authInstance = getAuth(firebaseApp);
      console.log('✅ [Firebase] Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT env var');
      return { app: firebaseApp, auth: authInstance };
    } catch (err) {
      console.error('❌ [Firebase] Failed to initialize from FIREBASE_SERVICE_ACCOUNT:', err.message);
    }
  }

  // 2. Try local file (firebase-service-account.json)
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || 'jobb-8efa6',
      });
      authInstance = getAuth(firebaseApp);
      console.log('✅ [Firebase] Admin SDK initialized from local file');
      return { app: firebaseApp, auth: authInstance };
    } catch (err) {
      console.error('❌ [Firebase] Admin SDK initialization from file failed:', err.message);
    }
  }

  console.warn('\n⚠️  [Firebase] Firebase Service Account not found');
  console.warn('   Running with JWT payload extraction mode (Google profile preserved)\n');
  return null;
}

module.exports = initFirebaseAdmin();
