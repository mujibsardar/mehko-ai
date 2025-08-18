#!/usr/bin/env node
import fs from "fs";
import path from "path";
import url from "url";
import process from "process";
import {
  initializeApp,
  cert,
  getApps,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** -------- CLI PARSE -------- */
function parseArgs(argv = process.argv.slice(2)) {
  const flags = {
    dryRun: false,
    emulator: false,
    only: null,
    file: null,
    path: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") flags.dryRun = true;
    else if (a === "--emulator") flags.emulator = true;
    else if (a === "--only") flags.only = argv[++i];
    else if (a === "--file") flags.file = argv[++i];
    else if (a === "--path") flags.path = argv[++i];
    else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  if (!flags.file && !flags.path) {
    console.error("Provide --file <json> or --path <dir>");
    process.exit(2);
  }
  return flags;
}

/** -------- FIREBASE INIT -------- */
function initFirebase({ emulator }) {
  const useEmu = emulator || !!process.env.FIRESTORE_EMULATOR_HOST;
  if (!getApps().length) {
    if (useEmu) {
      const projectId =
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT_ID ||
        "local-seed";
      initializeApp({ projectId, credential: applicationDefault() });
      process.env.FIRESTORE_EMULATOR_HOST =
        process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
      logInfo(
        `Using Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST} (projectId=${projectId})`
      );
    } else {
      const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!keyPath || !fs.existsSync(keyPath)) {
        console.error("GOOGLE_APPLICATION_CREDENTIALS not set or file missing");
        process.exit(2);
      }
      initializeApp({ credential: cert(keyPath) });
      logInfo("Initialized Firebase Admin for PROD");
    }
  }
  return getFirestore();
}

/** -------- LOAD JSONS -------- */
function loadJsons(flags) {
  const files = [];
  if (flags.file) files.push(flags.file);
  if (flags.path) {
    const entries = fs.readdirSync(flags.path);
    for (const f of entries)
      if (f.endsWith(".json")) files.push(path.join(flags.path, f));
  }
  if (!files.length) {
    console.error("No JSON files found.");
    process.exit(2);
  }
  const blobs = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(f, "utf8");
      blobs.push({ file: f, data: JSON.parse(raw) });
    } catch (e) {
      logFail(path.basename(f), [`Invalid JSON: ${e.message}`]);
    }
  }
  return blobs;
}

/** -------- NORMALIZE TO ARRAY<Application> -------- */
function normalize(inputs) {
  const out = [];
  for (const { file, data } of inputs) {
    if (Array.isArray(data)) {
      data.forEach((a, idx) => out.push({ __file: file, __idx: idx, ...a }));
    } else if (data && typeof data === "object" && data.id) {
      out.push({ __file: file, ...data });
    } else if (data && typeof data === "object") {
      // object map {[id]: Application}
      for (const [id, app] of Object.entries(data)) {
        out.push({ __file: file, id, ...app });
      }
    } else {
      logFail(file, ["Unsupported JSON structure"]);
    }
  }
  return out;
}

/** -------- VALIDATION -------- */
const ID_RE = /^[a-z0-9_]+$/;
function validate(app) {
  const errs = [];
  const where = app.__file ? `${path.basename(app.__file)}` : "input";

  // required top-level
  if (!app.id || typeof app.id !== "string" || !ID_RE.test(app.id)) {
    errs.push(`id missing/invalid (must match ${ID_RE})`);
  }
  for (const k of ["title", "description", "rootDomain"]) {
    if (!app[k] || typeof app[k] !== "string")
      errs.push(`${k} missing/non-string`);
  }
  // supportTools
  if (
    !app.supportTools ||
    typeof app.supportTools.aiEnabled !== "boolean" ||
    typeof app.supportTools.commentsEnabled !== "boolean"
  ) {
    errs.push("supportTools.aiEnabled/commentsEnabled must be booleans");
  }
  // steps
  if (!Array.isArray(app.steps) || app.steps.length === 0) {
    errs.push("steps required (non-empty array)");
  } else {
    const ids = new Set();
    let hasInfo = false,
      hasPdf = false;
    app.steps.forEach((s, i) => {
      const p = `steps[${i}]`;
      for (const k of ["id", "title", "type", "content"]) {
        if (!s || typeof s[k] !== "string" || !s[k].trim())
          errs.push(`${p}.${k} missing/non-string`);
      }
      if (s?.id) {
        if (!ID_RE.test(s.id)) errs.push(`${p}.id must match ${ID_RE}`);
        if (ids.has(s.id)) errs.push(`${p}.id duplicate within app`);
        ids.add(s.id);
      }
      if (!["info", "form", "pdf"].includes(s?.type))
        errs.push(`${p}.type invalid`);
      if (
        s?.type === "form" &&
        (!s.formName || typeof s.formName !== "string")
      ) {
        errs.push(`${p}.formName required for type=form`);
      }
      if (s?.type === "pdf") {
        if (!s.formId || typeof s.formId !== "string")
          errs.push(`${p}.formId required for type=pdf`);
        if (!s.appId || typeof s.appId !== "string")
          errs.push(`${p}.appId required for type=pdf`);
      }
      if (s?.type === "info") hasInfo = true;
      if (s?.type === "pdf") hasPdf = true;
    });
    if (!hasInfo) errs.push("at least one steps[].type === 'info' required");
    if (!hasPdf) errs.push("at least one steps[].type === 'pdf' required");
  }

  return errs;
}

/** -------- LOGGING -------- */
function logInfo(msg) {
  console.log(`ℹ️  ${msg}`);
}
function logOk(id) {
  console.log(`✅ Upserted: ${id}`);
}
function logPlan(app) {
  console.log(`📝 Plan: upsert applications/${app.id}`);
}
function logSkip(id, reason) {
  console.log(`⏭️  Skipped ${id}: ${reason}`);
}
function logFail(id, errors) {
  if (!errors?.length) return;
  console.error(`❌ ${id}:`);
  for (const e of errors) console.error(`   - ${e}`);
}

/** -------- MAIN -------- */
(async function main() {
  const flags = parseArgs();
  const db = initFirebase({ emulator: flags.emulator });
  const inputs = loadJsons(flags);
  const apps = normalize(inputs);

  let hadError = false;
  for (const app of apps) {
    if (flags.only && app.id !== flags.only) continue;
    const errors = validate(app);
    if (errors.length) {
      hadError = true;
      logFail(app.id || app.__file, errors);
      continue;
    }
    if (flags.dryRun) {
      logPlan(app);
      continue;
    }

    try {
      await db
        .collection("applications")
        .doc(app.id)
        .set(stripMeta(app), { merge: true });
      logOk(app.id);
    } catch (e) {
      hadError = true;
      logFail(app.id, [e.message]);
    }
  }

  process.exit(hadError ? 1 : 0);
})();

function stripMeta(app) {
  const { __file, __idx, ...clean } = app;
  return clean;
}
