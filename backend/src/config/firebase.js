const admin = require('firebase-admin');
const path = require('path');

let db = null;

try {
  const keyPath = path.join(__dirname, '../../serviceAccountKey.json');
  const serviceAccount = require(keyPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
  console.log('✅ Firebase Firestore connected');
} catch (err) {
  console.warn('⚠️  Firebase not configured:', err.message);
  console.warn('   → Backend will run without Firestore. Add serviceAccountKey.json to enable.');
}

module.exports = { admin, db };