#!/usr/bin/env node
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TEST_USER_EMAIL = 'test@test.com';
const TEST_USER_PASSWORD = 'Test123!';
const TEST_USER_NAME = 'Test User';

async function setupTestUser() {
  console.log('🔧 Setting up test user for AI Chat tests...');
  console.log(`Email: ${TEST_USER_EMAIL}`);
  console.log(`Password: ${TEST_USER_PASSWORD}`);
  console.log('');

  try {
    // Try to sign in first to see if user exists
    console.log('🔍 Checking if test user already exists...');
    try {
      await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('✅ Test user already exists and credentials are valid');
      
      // Sign out
      await auth.signOut();
      console.log('✅ Test user setup complete - user exists and can authenticate');
      console.log('');
      console.log('🧪 You can now run E2E tests that require authentication:');
      console.log('   npm run test:e2e tests/e2e/auth-real.spec.js');
      console.log('   npm run test:e2e tests/e2e/ai-chat-real.spec.js');
      console.log('');
      console.log('📚 For more testing options, see:');
      console.log('   npm run test:e2e --help');
      return;
    } catch (signInError) {
      if (signInError.code === 'auth/user-not-found') {
        console.log('❌ Test user does not exist, creating new account...');
      } else if (signInError.code === 'auth/wrong-password') {
        console.log('❌ Test user exists but password is incorrect, updating...');
        // Note: Firebase doesn't allow password updates without re-authentication
        // We'll need to create a new user with the correct password
        console.log('⚠️  Cannot update password without re-auth, creating new user...');
      } else {
        console.log(`❌ Unexpected error during sign in: ${signInError.code}`);
        throw signInError;
      }
    }

    // Create new test user
    console.log('👤 Creating new test user account...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      TEST_USER_EMAIL,
      TEST_USER_PASSWORD
    );

    const user = userCredential.user;
    console.log(`✅ Test user created with UID: ${user.uid}`);

    // Update profile with display name
    console.log('📝 Setting display name...');
    // Note: updateProfile requires the user to be signed in, which we are after creation
    
    // Store additional user data in Firestore
    console.log('💾 Storing user data in Firestore...');
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      displayName: TEST_USER_NAME,
      createdAt: new Date().toISOString(),
      role: 'user', // Regular user role
      isTestUser: true, // Mark as test user
    });

    console.log('✅ Test user data stored in Firestore');

    // Sign out
    await auth.signOut();
    console.log('✅ Signed out from test account');

    // Verify we can sign in with the new credentials
    console.log('🔍 Verifying test user can sign in...');
    await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    console.log('✅ Test user can successfully sign in');
    
    await auth.signOut();
    console.log('✅ Test user setup complete!');
    console.log('');
    console.log('🧪 You can now run E2E tests that require authentication:');
    console.log('   npm run test:e2e tests/e2e/auth-real.spec.js');
    console.log('   npm run test:e2e tests/e2e/ai-chat-real.spec.js');
    console.log('');
    console.log('📚 For more testing options, see:');
    console.log('   npm run test:e2e --help');

  } catch (error) {
    console.error('❌ Error setting up test user:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('');
      console.log('💡 The test email is already in use. You may need to:');
      console.log('   1. Delete the existing user from Firebase Console');
      console.log('   2. Or use a different test email address');
      console.log('   3. Or reset the password for the existing user');
    }
    
    process.exit(1);
  }
}

// Run the setup
setupTestUser().catch(console.error);
