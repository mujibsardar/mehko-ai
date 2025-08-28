#!/usr/bin/env node

/**
 * Test script for AcroForm field definition format
 * Tests the conversion from overlay.json to acroform-definition.json
 */

import fs from 'fs';
import path from 'path';

// Test data - simulate the conversion process
const testOverlay = {
  fields: [
    {
      id: "business_name",
      label: "Business Name",
      type: "text",
      page: 0,
      rect: [100, 200, 300, 220],
      fontSize: 12,
      align: "left"
    },
    {
      id: "owner_name",
      label: "Owner Name",
      type: "text", 
      page: 0,
      rect: [100, 250, 300, 270],
      fontSize: 12,
      align: "left"
    },
    {
      id: "signature",
      label: "Signature",
      type: "signature",
      page: 0,
      rect: [100, 500, 250, 550],
      fontSize: 12,
      align: "left"
    }
  ]
};

// Conversion function (same as in the React component)
function convertOverlayToAcroForm(overlay, formName) {
  return {
    formMetadata: {
      title: formName.replace(/_/g, " ").replace(/.pdf$/i, ""),
      description: `Converted from overlay: ${formName}`,
      version: "1.0",
      type: "acroform",
      converted: true
    },
    fields: overlay.fields.map(field => ({
      id: field.id,
      label: field.label,
      type: field.type,
      page: field.page || 0,
      required: true,
      validation: getDefaultValidation(field.type),
      properties: getDefaultProperties(field.type),
      styling: {
        fontSize: field.fontSize || 12,
        fontFamily: "Helvetica",
        textAlign: field.align || "left",
        color: "#000000"
      },
      aiConfidence: 0.8,
      aiReasoning: "Converted from overlay coordinates"
    })),
    formSettings: {
      autoSave: true,
      validationMode: "real-time",
      submitBehavior: "download",
      theme: "default"
    }
  };
}

function getDefaultValidation(type) {
  const base = { required: true };
  switch (type) {
    case "text":
    case "textarea":
      return { ...base, minLength: 2, maxLength: 100 };
    case "email":
      return { ...base, pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" };
    case "tel":
      return { ...base, pattern: "^[\\+]?[1-9]\\d{1,14}$" };
    case "number":
      return { ...base, min: 0, max: 999999 };
    case "date":
      return { ...base, minDate: "1900-01-01", maxDate: "2100-12-31" };
    default:
      return base;
  }
}

function getDefaultProperties(type) {
  const base = { defaultValue: "", readOnly: false };
  switch (type) {
    case "text":
    case "email":
    case "tel":
      return { ...base, placeholder: `Enter ${type}`, maxLength: 100 };
    case "textarea":
      return { ...base, placeholder: "Enter text", maxLength: 500, rows: 3 };
    case "number":
      return { ...base, placeholder: "0", min: 0, max: 999999 };
    case "date":
      return { ...base, placeholder: "MM/DD/YYYY" };
    case "checkbox":
      return { ...base, defaultValue: false };
    case "signature":
      return { ...base, placeholder: "Click to sign" };
    default:
      return base;
  }
}

// Test the conversion
console.log("🧪 Testing AcroForm Field Definition Conversion\n");

console.log("📋 Input Overlay Data:");
console.log(JSON.stringify(testOverlay, null, 2));

console.log("\n🔄 Converting to AcroForm format...");
const converted = convertOverlayToAcroForm(testOverlay, "MEHKO_SOP-English");

console.log("\n✅ Converted AcroForm Definition:");
console.log(JSON.stringify(converted, null, 2));

// Test field validation
console.log("\n🔍 Field Validation Analysis:");
converted.fields.forEach(field => {
  console.log(`\n📝 Field: ${field.label} (${field.type})`);
  console.log(`   - Required: ${field.validation.required}`);
  console.log(`   - Validation Rules: ${Object.keys(field.validation).join(", ")}`);
  console.log(`   - Properties: ${Object.keys(field.properties).join(", ")}`);
  console.log(`   - Styling: ${Object.keys(field.styling).join(", ")}`);
});

// Test the new format structure
console.log("\n📊 Format Structure Analysis:");
console.log(`   - Total Fields: ${converted.fields.length}`);
console.log(`   - Field Types: ${[...new Set(converted.fields.map(f => f.type))].join(", ")}`);
console.log(`   - Has Validation: ${converted.fields.every(f => f.validation) ? "✅" : "❌"}`);
console.log(`   - Has Properties: ${converted.fields.every(f => f.properties) ? "✅" : "❌"}`);
console.log(`   - Has Styling: ${converted.fields.every(f => f.styling) ? "✅" : "❌"}`);

// Test specific field types
console.log("\n🎯 Field Type Specific Tests:");
const textField = converted.fields.find(f => f.type === "text");
const signatureField = converted.fields.find(f => f.type === "signature");

if (textField) {
  console.log(`\n📝 Text Field (${textField.label}):`);
  console.log(`   - Min Length: ${textField.validation.minLength}`);
  console.log(`   - Max Length: ${textField.validation.maxLength}`);
  console.log(`   - Placeholder: "${textField.properties.placeholder}"`);
}

if (signatureField) {
  console.log(`\n✍️ Signature Field (${signatureField.label}):`);
  console.log(`   - Required: ${signatureField.validation.required}`);
  console.log(`   - Placeholder: "${signatureField.properties.placeholder}"`);
  console.log(`   - Border Style: ${signatureField.styling.borderStyle || "default"}`);
}

console.log("\n🎉 Conversion Test Complete!");
console.log("\n💡 Key Benefits of New Format:");
console.log("   ✅ No more coordinate-based positioning");
console.log("   ✅ Rich validation rules");
console.log("   ✅ Field properties and placeholders");
console.log("   ✅ Consistent styling options");
console.log("   ✅ AI confidence tracking");
console.log("   ✅ Template-driven approach");

// Save test output
const outputPath = path.join(process.cwd(), 'temp', 'test-acroform-definition.json');
const tempDir = path.dirname(outputPath);

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
console.log(`\n💾 Test output saved to: ${outputPath}`);
