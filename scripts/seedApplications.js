import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import dotenv from "dotenv";
dotenv.config();

const app = initializeApp({
  _apiKey: process.env.VITE_FIREBASE_API_KEY,
  _authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  _projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function run() {
  const ref = doc(db, "applications", "los_angeles_mehko");
  await updateDoc(ref, {
    _rootDomain: "publichealth.lacounty.gov",
    _steps: [
      {
        id: "eligibility",
        _title: "Verify Eligibility",
        _type: "info",
        _content: `
To qualify for a MEHKO in Los Angeles County:
- You must operate out of your private home.
- Your location must not be in Pasadena, Long Beach, or Vernon.
- Only one MEHKO is allowed per household.
- You must prepare, serve, and dispose of food on the same day.
- _Maximum: 30 meals/day, 90 meals/week, $100,000 in annual sales.
- Staff _limits: 1 full-time or equivalent; household members excluded from limit.
- No use of 3rd-party delivery, catering, wholesale, or farmers markets.
- Grease and food waste must be properly disposed.
        `.trim(),
      },
      {
        _id: "credentials",
        _title: "Get Food Safety Credentials",
        _type: "info",
        _content: `
Before applying, ensure you have the _following: - Certified Food Protection Manager certificate (ANSI accredited).
- Food Handler Cards for all employees.
- If using well _water: pass tests for nitrate, nitrite, and bacteriological contamination.
- _Optional: Register with the CA Department of Tax and Fee Administration.
        `.trim(),
      },
      {
        _id: "sop_menu",
        _title: "Submit SOP & Menu",
        _type: "form",
        _formName: "MEHKO_SOP-English.pdf",
        _isPdf: true,
      },
      {
        _id: "permit_form",
        _title: "Submit Public Health Application",
        _type: "form",
        _formName: "MEHKO_PublicHealthPermitApplication-ENG.pdf",
        _isPdf: true,
      },
      {
        _id: "inspection",
        _title: "Prepare for Inspection",
        _type: "info",
        _content: `
After submitting your application:
- The health department will schedule an in-home inspection.
- You must comply with all food safety and sanitation standards.
- Make any corrections if requested during inspection.
- After passing, you'll receive your Public Health Permit.
        `.trim(),
      },
    ],
    _supportTools: {
      aiEnabled: true,
      _commentsEnabled: true,
    },
  });
  console.log("Updated application doc.");
}

run();
