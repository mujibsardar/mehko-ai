import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

const db = getFirestore(app);

async function updateSantaBarbara() {
  try {
    // Read the updated JSON file
    const jsonPath = join(__dirname, "..", "data", "santabarbara_mehko.json");
    const jsonContent = readFileSync(jsonPath, "utf8");
    const appData = JSON.parse(jsonContent);

    console.log("Updating Santa Barbara County MEHKO in database...");

    // Update the database record
    const ref = doc(db, "applications", "santabarbara_mehko");
    await setDoc(ref, appData, { merge: true });

    console.log("✅ Successfully updated Santa Barbara County MEHKO!");
    console.log("The application should now display with the new format.");
  } catch (error) {
    console.error("❌ Error updating Santa Barbara County:", error);
    process.exit(1);
  }
}

updateSantaBarbara();
