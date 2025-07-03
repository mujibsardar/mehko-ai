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
    rootDomain: "publichealth.lacounty.gov",
    steps: [
      {
        id: "eligibility",
        title: "Verify Eligibility",
        type: "info",
        content: `
To qualify for a MEHKO in Los Angeles County:
- You must operate out of your private home.
- Your location must not be in Pasadena, Long Beach, or Vernon.
- Only one MEHKO is allowed per household.
- You must prepare, serve, and dispose of food on the same day.
- Maximum: 30 meals/day, 90 meals/week, $100,000 in annual sales.
- Staff limits: 1 full-time or equivalent; household members excluded from limit.
- No use of 3rd-party delivery, catering, wholesale, or farmers markets.
- Grease and food waste must be properly disposed.
        `.trim(),
      },
      {
        id: "credentials",
        title: "Get Food Safety Credentials",
        type: "info",
        content: `
Before applying, ensure you have the following:
- Certified Food Protection Manager certificate (ANSI accredited).
- Food Handler Cards for all employees.
- If using well water: pass tests for nitrate, nitrite, and bacteriological contamination.
- Optional: Register with the CA Department of Tax and Fee Administration.
        `.trim(),
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
        title: "Submit Public Health Application",
        type: "form",
        formName: "MEHKO_PublicHealthPermitApplication-ENG.pdf",
        isPdf: true,
      },
      {
        id: "inspection",
        title: "Prepare for Inspection",
        type: "info",
        content: `
After submitting your application:
- The health department will schedule an in-home inspection.
- You must comply with all food safety and sanitation standards.
- Make any corrections if requested during inspection.
- After passing, you'll receive your Public Health Permit.
        `.trim(),
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
