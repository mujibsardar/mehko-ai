// scripts/updateApplication.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import dotenv from "dotenv";
dotenv.config();

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function run() {
  const ref = doc(db, "applications", "los_angeles_mehko");
  await updateDoc(ref, {
    steps: [
      {
        id: "eligibility",
        title: "Verify Eligibility",
        type: "info",
      },
      {
        id: "sop_menu",
        title: "Submit SOP & Menu",
        type: "form",
        formName: "MEHKO_SOP-English.pdf",
        isPdf: true,
      },
      {
        id: "permit_form",
        title: "Submit Public Health Form",
        type: "form",
        formName: "MEHKO_PublicHealthPermitApplication-ENG.pdf",
        isPdf: true,
      },
    ],
    supportTools: {
      aiEnabled: true,
      commentsEnabled: true,
    },
  });
  console.log("Updated application doc.");
}
run();
