/**
 * Firebase Admin SDK initialization
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Firebase Console → https://console.firebase.google.com
 * 2. Select project: jobb-8efa6
 * 3. Go to Project Settings → Service Accounts
 * 4. Click "Generate new private key"
 * 5. Save the downloaded JSON file as: backend/config/firebase-service-account.json
 * 6. NEVER commit firebase-service-account.json to git
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

  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.warn('\n⚠️  [Firebase] firebase-service-account.json NOT FOUND');
    console.warn('   Firebase Admin SDK is DISABLED — running in dev/guest mode');
    console.warn('   To enable: download from Firebase Console → Project Settings → Service Accounts');
    console.warn(`   Save to: ${serviceAccountPath}\n`);
    return null;
  }

  try {
    const serviceAccount = require(serviceAccountPath);
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'jobb-8efa6',
    });
    authInstance = getAuth(firebaseApp);
    console.log('✅ [Firebase] Admin SDK initialized successfully');
    return { app: firebaseApp, auth: authInstance };
  } catch (err) {
    console.error('❌ [Firebase] Admin SDK initialization failed:', err.message);
    return null;
  }
}

module.exports = initFirebaseAdmin();
