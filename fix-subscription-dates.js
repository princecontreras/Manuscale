#!/usr/bin/env node

/**
 * Fix subscription dates for a specific user
 * Fixes: currentPeriodEnd to be 1 month in the future
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Read the firebase config
const configPath = path.join(__dirname, 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
let app;

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: config.projectId,
    });
    console.log('✓ Initialized Firebase Admin with service account');
  } else {
    throw new Error('serviceAccountKey.json not found');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();
db.settings({ 
  projectId: config.projectId,
  databaseId: config.firestoreDatabaseId 
});

async function fixUserSubscription(email) {
  console.log(`\n📋 Starting subscription date fix for: ${email}`);
  
  try {
    // Find user by email
    console.log('🔍 Looking up user by email...');
    const querySnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    const userDoc = querySnapshot.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();

    console.log(`✓ Found user: ${uid}`);
    console.log(`  Current subscription status: ${userData.subscriptionStatus}`);
    console.log(`  Current plan: ${userData.plan}`);
    console.log(`  Current period start: ${userData.currentPeriodStart?.toDate?.() || userData.currentPeriodStart}`);
    console.log(`  Current period end: ${userData.currentPeriodEnd?.toDate?.() || userData.currentPeriodEnd}`);
    console.log(`  Cancel at: ${userData.cancelAt?.toDate?.() || userData.cancelAt}`);
    console.log(`  Cancel at period end: ${userData.cancelAtPeriodEnd}`);

    // Fix the dates
    const currentPeriodStart = userData.currentPeriodStart?.toDate?.() || new Date(userData.currentPeriodStart);
    
    // Calculate 1 month from current period start
    const newPeriodEnd = new Date(currentPeriodStart);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    console.log(`\n🔧 Applying fixes:`);
    console.log(`  New period end: ${newPeriodEnd.toUTCString()}`);

    // Update the user document
    await db.collection('users').doc(uid).set({
      currentPeriodEnd: newPeriodEnd,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      subscriptionStatus: 'active',
      updatedAt: new Date(),
    }, { merge: true });

    console.log(`\n✅ Successfully updated subscription dates for ${email}`);
    
    // Verify the update
    const updatedDoc = await db.collection('users').doc(uid).get();
    const updatedData = updatedDoc.data();
    console.log(`\n📝 Verification:`);
    console.log(`  Updated period start: ${updatedData.currentPeriodStart?.toDate?.() || updatedData.currentPeriodStart}`);
    console.log(`  Updated period end: ${updatedData.currentPeriodEnd?.toDate?.() || updatedData.currentPeriodEnd}`);
    console.log(`  Updated status: ${updatedData.subscriptionStatus}`);
    console.log(`  Cancel at period end: ${updatedData.cancelAtPeriodEnd}`);

  } catch (error) {
    console.error(`\n❌ Error fixing subscription:`, error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

// Run the fix
const email = process.argv[2] || 'contrerasprince6@gmail.com';
fixUserSubscription(email).then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
});
