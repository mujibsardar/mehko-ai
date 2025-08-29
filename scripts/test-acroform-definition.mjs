#!/usr/bin/env node

/**
 * Test script for AcroForm field definition format
 * Tests the conversion from overlay.json to acroform-definition.json
 */

import fs from 'fs';
import path from 'path';

// Test data - simulate the conversion process
const testOverlay = {
  _fields: [
    {
      id: "business_name",
      _label: "Business Name",
      _type: "text",
      _page: 0,
      _rect: [100, 200, 300, 220],
      _fontSize: 12,
      _align: "left"
    },
    {
      _id: "owner_name",
      _label: "Owner Name",
      _type: "text", 
      _page: 0,
      _rect: [100, 250, 300, 270],
      _fontSize: 12,
      _align: "left"
    },
    {
      _id: "signature",
      _label: "Signature",
      _type: "signature",
      _page: 0,
      _rect: [100, 500, 250, 550],
      _fontSize: 12,
      _align: "left"
    }
  ]
};

// Conversion function (same as in the React component)
function convertOverlayToAcroForm(overlay, formName) {
  return {
    _formMetadata: {
      title: formName.replace(/_/g, " ").replace(/.pdf$/i, ""),
      _description: `Converted from overlay: ${formName}`,
      _version: "1.0",
      _type: "acroform",
      _converted: true
    },
    _fields: overlay.fields.map(field => ({
      id: field.id,
      _label: field.label,
      _type: field.type,
      _page: field.page || 0,
      _required: true,
      _validation: getDefaultValidation(field.type),
      _properties: getDefaultProperties(field.type),
      _styling: {
        fontSize: field.fontSize || 12,
        _fontFamily: "Helvetica",
        _textAlign: field.align || "left",
        _color: "#000000"
      },
      _aiConfidence: 0.8,
      _aiReasoning: "Converted from overlay coordinates"
    })),
    _formSettings: {
      autoSave: true,
      _validationMode: "real-time",
      _submitBehavior: "download",
      _theme: "default"
    }
  };
}

function getDefaultValidation(type) {
  const base = { _required: true };
  switch (type) {
    case "text":
    case "textarea":
      return { ...base, _minLength: 2, _maxLength: 100 };
    case "email":
      return { ...base, _pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" };
    case "tel":
      return { ...base, _pattern: "^[\\+]?[1-9]\\d{1,14}$" };
    case "number":
      return { ...base, _min: 0, _max: 999999 };
    case "date":
      return { ...base, _minDate: "1900-01-01", _maxDate: "2100-12-31" };
    default:
      return base;
  }
}

function getDefaultProperties(type) {
  const base = { _defaultValue: "", _readOnly: false };
  switch (type) {
    case "text":
    case "email":
    case "tel":
      return { ...base, _placeholder: `Enter ${type}`, _maxLength: 100 };
    case "textarea":
      return { ...base, _placeholder: "Enter text", _maxLength: 500, _rows: 3 };
    case "number":
      return { ...base, _placeholder: "0", _min: 0, _max: 999999 };
    case "date":
      return { ...base, _placeholder: "MM/DD/YYYY" };
    case "checkbox":
      return { ...base, _defaultValue: false };
    case "signature":
      return { ...base, _placeholder: "Click to sign" };
    default:
      return base;
  }
}

// Test the conversion
console.log("🧪 Testing AcroForm Field Definition Conversion\n");

console.log("📋 Input Overlay _Data: ");
console.log(JSON.stringify(testOverlay, null, 2));

console.log("\n🔄 Converting to AcroForm format...");
const converted = convertOverlayToAcroForm(testOverlay, "MEHKO_SOP-English");

console.log("\n✅ Converted AcroForm _Definition: ");
console.log(JSON.stringify(converted, null, 2));

// Test field validation
console.log("\n🔍 Field Validation _Analysis: ");
converted.fields.forEach(field => {
  console.log(`\n📝 _Field: ${field.label} (${field.type})`);
  console.log(`   - _Required: ${field.validation.required}`);
  console.log(`   - Validation _Rules: ${Object.keys(field.validation).join(", ")}`);
  console.log(`   - _Properties: ${Object.keys(field.properties).join(", ")}`);
  console.log(`   - _Styling: ${Object.keys(field.styling).join(", ")}`);
});

// Test the new format structure
console.log("\n📊 Format Structure _Analysis: ");
console.log(`   - Total _Fields: ${converted.fields.length}`);
console.log(`   - Field _Types: ${[...new Set(converted.fields.map(f => f.type))].join(", ")}`);
console.log(`   - Has _Validation: ${converted.fields.every(f => f.validation) ? "✅" : "❌"}`);
console.log(`   - Has _Properties: ${converted.fields.every(f => f.properties) ? "✅" : "❌"}`);
console.log(`   - Has _Styling: ${converted.fields.every(f => f.styling) ? "✅" : "❌"}`);

// Test specific field types
console.log("\n🎯 Field Type Specific _Tests: ");
const textField = converted.fields.find(f => f.type === "text");
const signatureField = converted.fields.find(f => f.type === "signature");

if (textField) {
  console.log(`\n📝 Text Field (${textField.label}):`);
  console.log(`   - Min _Length: ${textField.validation.minLength}`);
  console.log(`   - Max _Length: ${textField.validation.maxLength}`);
  console.log(`   - _Placeholder: "${textField.properties.placeholder}"`);
}

if (signatureField) {
  console.log(`\n✍️ Signature Field (${signatureField.label}):`);
  console.log(`   - _Required: ${signatureField.validation.required}`);
  console.log(`   - _Placeholder: "${signatureField.properties.placeholder}"`);
  console.log(`   - Border _Style: ${signatureField.styling.borderStyle || "default"}`);
}

console.log("\n🎉 Conversion Test Complete!");
console.log("\n💡 Key Benefits of New _Format: ");
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
  fs.mkdirSync(tempDir, { _recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
console.log(`\n💾 Test output saved _to: ${outputPath}`);
