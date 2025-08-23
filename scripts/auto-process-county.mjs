#!/usr/bin/env node

/**
 * Auto-Process County JSON
 * 
 * This script automatically processes uploaded county JSON files by:
 * 1. Validating the JSON structure
 * 2. Adding the county to the manifest
 * 3. Downloading all required PDF forms
 * 4. Setting up the application directory structure
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.join(__dirname, '../data');
const APPLICATIONS_DIR = path.join(__dirname, '../applications');
const MANIFEST_FILE = path.join(DATA_DIR, 'manifest.json');

class CountyProcessor {
  constructor() {
    this.manifest = null;
    this.countyData = null;
  }

  async loadManifest() {
    try {
      const manifestContent = await fs.readFile(MANIFEST_FILE, 'utf8');
      this.manifest = JSON.parse(manifestContent);
      console.log(`✅ Loaded manifest with ${this.manifest.length} counties`);
    } catch (error) {
      console.error('❌ Failed to load manifest:', error.message);
      throw error;
    }
  }

  async loadCountyData(countyId) {
    const countyFile = path.join(DATA_DIR, `${countyId}.json`);
    try {
      const countyContent = await fs.readFile(countyFile, 'utf8');
      this.countyData = JSON.parse(countyContent);
      console.log(`✅ Loaded county data for ${this.countyData.title}`);
      return this.countyData;
    } catch (error) {
      console.error(`❌ Failed to load county data from ${countyFile}:`, error.message);
      throw error;
    }
  }

  validateCountyData() {
    const required = ['id', 'title', 'description', 'rootDomain', 'supportTools', 'steps'];
    const missing = required.filter(field => !this.countyData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!Array.isArray(this.countyData.steps) || this.countyData.steps.length === 0) {
      throw new Error('County must have at least one step');
    }

    // Validate PDF steps
    const pdfSteps = this.countyData.steps.filter(step => step.type === 'pdf');
    for (const step of pdfSteps) {
      if (!step.formId || !step.pdfUrl) {
        throw new Error(`PDF step ${step.id} missing formId or pdfUrl`);
      }
    }

    console.log(`✅ County data validation passed (${this.countyData.steps.length} steps, ${pdfSteps.length} PDF forms)`);
  }

  async addToManifest() {
    // Check if county already exists
    const existingIndex = this.manifest.findIndex(county => county.id === this.countyData.id);
    
    if (existingIndex !== -1) {
      console.log(`⚠️  County ${this.countyData.id} already exists in manifest, updating...`);
      this.manifest[existingIndex] = this.countyData;
    } else {
      console.log(`➕ Adding ${this.countyData.id} to manifest...`);
      this.manifest.push(this.countyData);
    }

    // Save updated manifest
    await fs.writeFile(MANIFEST_FILE, JSON.stringify(this.manifest, null, 2));
    console.log(`✅ Manifest updated successfully`);
  }

  async createApplicationDirectory() {
    const countyDir = path.join(APPLICATIONS_DIR, this.countyData.id);
    const formsDir = path.join(countyDir, 'forms');

    try {
      await fs.mkdir(countyDir, { recursive: true });
      await fs.mkdir(formsDir, { recursive: true });
      console.log(`✅ Created application directory: ${countyDir}`);
    } catch (error) {
      console.error('❌ Failed to create application directory:', error.message);
      throw error;
    }
  }

  async downloadPDFForm(step) {
    if (step.type !== 'pdf') return;

    const formDir = path.join(APPLICATIONS_DIR, this.countyData.id, 'forms', step.formId);
    
    try {
      await fs.mkdir(formDir, { recursive: true });
      
      // Create meta.json for the form
      const metaData = {
        id: step.formId,
        title: step.title,
        type: 'pdf',
        appId: this.countyData.id,
        stepId: step.id,
        pdfUrl: step.pdfUrl,
        createdAt: new Date().toISOString()
      };

      await fs.writeFile(path.join(formDir, 'meta.json'), JSON.stringify(metaData, null, 2));
      
      // Download the PDF
      console.log(`📥 Downloading PDF for ${step.title}...`);
      const response = await fetch(step.pdfUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pdfBuffer = await response.arrayBuffer();
      await fs.writeFile(path.join(formDir, 'form.pdf'), Buffer.from(pdfBuffer));
      
      console.log(`✅ Downloaded ${step.title} (${Math.round(pdfBuffer.byteLength / 1024)}KB)`);
      
    } catch (error) {
      console.error(`❌ Failed to download ${step.title}:`, error.message);
      // Continue with other forms even if one fails
    }
  }

  async downloadAllPDFs() {
    const pdfSteps = this.countyData.steps.filter(step => step.type === 'pdf');
    
    if (pdfSteps.length === 0) {
      console.log('ℹ️  No PDF forms to download');
      return;
    }

    console.log(`📚 Downloading ${pdfSteps.length} PDF forms...`);
    
    for (const step of pdfSteps) {
      await this.downloadPDFForm(step);
    }
    
    console.log(`✅ PDF download process completed`);
  }

  async processCounty(countyId) {
    try {
      console.log(`🚀 Processing county: ${countyId}`);
      
      // Load and validate data
      await this.loadManifest();
      await this.loadCountyData(countyId);
      this.validateCountyData();
      
      // Process the county
      await this.addToManifest();
      await this.createApplicationDirectory();
      await this.downloadAllPDFs();
      
      console.log(`🎉 Successfully processed ${this.countyData.title}!`);
      console.log(`📁 Application directory: applications/${this.countyData.id}/`);
      console.log(`📋 Manifest updated: ${MANIFEST_FILE}`);
      
    } catch (error) {
      console.error(`💥 Failed to process county ${countyId}:`, error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node auto-process-county.mjs <county-id>');
    console.log('Example: node auto-process-county.mjs lake_county_mehko');
    process.exit(1);
  }

  const countyId = args[0];
  const processor = new CountyProcessor();
  
  await processor.processCounty(countyId);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default CountyProcessor;
