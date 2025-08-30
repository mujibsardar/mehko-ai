#!/usr/bin/env node

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  fs.readFileSync('./config/serviceAccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function clearFormData(options = {}) {
  const { all, testUsers, dryRun, help } = options;

  if (help) {
    console.log(`
🗑️  Firebase Form Data Cleanup Tool

Usage:
  node scripts/clear-form-data.mjs [options]

Options:
  --all           Clear ALL user form data (DANGEROUS!)
  --test-users    Clear only test user data (safer)
  --dry-run       Show what would be deleted without actually deleting
  --help          Show this help message

Examples:
  node scripts/clear-form-data.mjs --dry-run --test-users
  node scripts/clear-form-data.mjs --test-users
  node scripts/clear-form-data.mjs --all
    `);
    return;
  }

  if (!all && !testUsers) {
    console.log('❌ Please specify --all or --test-users option');
    console.log('💡 Use --help for more information');
    return;
  }

  if (all && !dryRun) {
    const answer = await askConfirmation(
      '⚠️  WARNING: This will delete ALL user form data!\n' +
      'This action cannot be undone. Are you sure? (yes/no): '
    );
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      return;
    }
  }

  try {
    console.log('🔍 Scanning Firebase for form data...');

    const usersRef = db.collection('users');
    const usersSnapshot = await usersRef.get();

    let deletedCount = 0;
    let testUserDeletedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Check if this is a test user (you can customize this logic)
      const isTestUser = isTestUserByEmail(userData.email) || 
                        isTestUserById(userId) ||
                        userId.includes('test') ||
                        (userData.email && userData.email.includes('test'));

      let shouldDelete = false;

      if (all) {
        shouldDelete = true;
      } else if (testUsers && isTestUser) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        if (dryRun) {
          console.log(`📋 Would delete form data for user: ${userId}${isTestUser ? ' (test user)' : ''}`);
        } else {
          // Delete formProgress collection
          const formProgressRef = db.collection('users').doc(userId).collection('formProgress');
          const formProgressSnapshot = await formProgressRef.get();
          
          for (const formDoc of formProgressSnapshot.docs) {
            await formDoc.ref.delete();
          }

          // Delete applicationProgress collection
          const appProgressRef = db.collection('users').doc(userId).collection('applicationProgress');
          const appProgressSnapshot = await appProgressRef.get();
          
          for (const progressDoc of appProgressSnapshot.docs) {
            await progressDoc.ref.delete();
          }

          console.log(`✅ Deleted form data for user: ${userId}${isTestUser ? ' (test user)' : ''}`);
        }

        deletedCount++;
        if (isTestUser) testUserDeletedCount++;
      }
    }

    if (dryRun) {
      console.log(`\n📊 Summary (DRY RUN):`);
      console.log(`📋 Would delete data for ${deletedCount} users`);
      if (testUsers) {
        console.log(`📋 ${testUserDeletedCount} of those are test users`);
      }
    } else {
      console.log(`\n✅ Cleanup completed successfully!`);
      console.log(`🗑️  Deleted data for ${deletedCount} users`);
      if (testUsers) {
        console.log(`🗑️  ${testUserDeletedCount} of those were test users`);
      }
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

function isTestUserByEmail(email) {
  if (!email) return false;
  
  const testPatterns = [
    'test@',
    '@test.',
    'example.com',
    'testuser',
    'demo@',
    'admin@',
  ];
  
  return testPatterns.some(pattern => 
    email.toLowerCase().includes(pattern)
  );
}

function isTestUserById(userId) {
  if (!userId) return false;
  
  const testPatterns = [
    'test',
    'demo',
    'admin',
    'user',
  ];
  
  return testPatterns.some(pattern => 
    userId.toLowerCase().includes(pattern)
  );
}

async function askConfirmation(question) {
  return new Promise((resolve) => {
    import('readline').then((readline) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  testUsers: args.includes('--test-users'),
  dryRun: args.includes('--dry-run'),
  help: args.includes('--help') || args.includes('-h')
};

clearFormData(options);
