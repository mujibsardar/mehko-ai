require("dotenv").config(); // ✅ Load .env manually

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const applications = require("../src/data/applications.json");

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const losAngeles = applications["los_angeles_mehko"];
  const ref = doc(db, "applications", losAngeles.id);
  await setDoc(ref, losAngeles);
  console.log("✅ Seeded Los Angeles MEHKO application");
}

seed();
