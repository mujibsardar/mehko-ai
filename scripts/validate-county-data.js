#!/usr/bin/env node

/**
 * County Data Validation Script
 * 
 * Validates county JSON files before uploading to admin dashboard.
 * Ensures data integrity, PDF accessibility, and proper formatting.
 * 
 * Usage:
 *   node scripts/validate-county-data.js <county-file.json>
 *   node scripts/validate-county-data.js data/alameda_county_mehko.json
 * 
 * Or validate all counties:
 *   node scripts/validate-county-data.js --all
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class CountyValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validatedPdfs = new Map();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(`❌ ERROR: ${message}`, 'red');
  }

  warning(message) {
    this.warnings.push(message);
    this.log(`⚠️  WARNING: ${message}`, 'yellow');
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }

  // Validate basic JSON structure
  validateStructure(data) {
    this.info('Validating JSON structure...');
    
    const requiredFields = ['id', 'title', 'description', 'rootDomain', 'supportTools', 'steps'];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        this.error(`Missing required field: ${field}`);
      }
    }

    // Validate supportTools
    if (data.supportTools) {
      if (typeof data.supportTools !== 'object') {
        this.error('supportTools must be an object');
      } else {
        if (typeof data.supportTools.aiEnabled !== 'boolean') {
          this.error('supportTools.aiEnabled must be a boolean');
        }
        if (typeof data.supportTools.commentsEnabled !== 'boolean') {
          this.error('supportTools.commentsEnabled must be a boolean');
        }
      }
    }

    // Validate steps array
    if (!Array.isArray(data.steps)) {
      this.error('steps must be an array');
      return;
    }

    if (data.steps.length === 0) {
      this.error('steps array cannot be empty');
      return;
    }

    // Check for at least one info and one pdf step
    const stepTypes = data.steps.map(s => s.type);
    if (!stepTypes.includes('info')) {
      this.error('At least one step must have type "info"');
    }
    if (!stepTypes.includes('pdf')) {
      this.error('At least one step must have type "pdf"');
    }

    this.success('JSON structure validation passed');
  }

  // Validate individual steps
  validateSteps(steps, countyId) {
    this.info('Validating steps...');
    
    const stepIds = new Set();
    let hasInfo = false;
    let hasPdf = false;

    steps.forEach((step, index) => {
      const stepPrefix = `steps[${index}]`;
      
      // Validate required step fields
      const requiredStepFields = ['id', 'title', 'type', 'content', 'action_required', 'fill_pdf'];
      for (const field of requiredStepFields) {
        if (!(field in step)) {
          this.error(`${stepPrefix}.${field} is required`);
        }
      }

      // Validate step ID uniqueness
      if (step.id) {
        if (stepIds.has(step.id)) {
          this.error(`${stepPrefix}.id "${step.id}" is duplicated`);
        }
        stepIds.add(step.id);
      }

      // Validate step type
      const validTypes = ['info', 'form', 'pdf'];
      if (step.type && !validTypes.includes(step.type)) {
        this.error(`${stepPrefix}.type must be one of: ${validTypes.join(', ')}`);
      }

      // Validate content formatting
      if (step.content) {
        this.validateContent(step.content, `${stepPrefix}.content`);
      }

      // Validate search terms
      if (step.searchTerms) {
        if (!Array.isArray(step.searchTerms)) {
          this.error(`${stepPrefix}.searchTerms must be an array`);
        } else {
          step.searchTerms.forEach((term, i) => {
            if (typeof term !== 'string' || !term.trim()) {
              this.error(`${stepPrefix}.searchTerms[${i}] must be a non-empty string`);
            }
          });
        }
      }

      // Validate PDF steps
      if (step.type === 'pdf') {
        hasPdf = true;
        this.validatePdfStep(step, stepPrefix, countyId);
      }

      // Validate info steps
      if (step.type === 'info') {
        hasInfo = true;
        if (!step.appId) {
          this.warning(`${stepPrefix}.appId is missing (recommended for info steps)`);
        } else if (step.appId !== countyId) {
          this.error(`${stepPrefix}.appId "${step.appId}" does not match county ID "${countyId}"`);
        }
      }

      // Validate form steps
      if (step.type === 'form') {
        if (!step.formName || typeof step.formName !== 'string') {
          this.error(`${stepPrefix}.formName is required for type="form"`);
        }
      }
    });

    if (hasInfo) this.success('Found info steps');
    if (hasPdf) this.success('Found PDF steps');
  }

  // Validate PDF step requirements
  validatePdfStep(step, stepPrefix, countyId) {
    const requiredPdfFields = ['formId', 'pdfUrl', 'appId'];
    
    for (const field of requiredPdfFields) {
      if (!step[field]) {
        this.error(`${stepPrefix}.${field} is required for PDF steps`);
      }
    }

    // Validate appId matches county ID
    if (step.appId && step.appId !== countyId) {
      this.error(`${stepPrefix}.appId "${step.appId}" does not match county ID "${countyId}"`);
    }

    // Validate formId naming convention
    if (step.formId) {
      if (!step.formId.match(/^[A-Z_]+$/)) {
        this.warning(`${stepPrefix}.formId "${step.formId}" should use UPPER_CASE format`);
      }
    }

    // Validate pdfUrl format
    if (step.pdfUrl) {
      try {
        new URL(step.pdfUrl);
        if (!step.pdfUrl.toLowerCase().endsWith('.pdf')) {
          this.warning(`${stepPrefix}.pdfUrl does not end with .pdf`);
        }
      } catch (e) {
        this.error(`${stepPrefix}.pdfUrl is not a valid URL`);
      }
    }
  }

  // Validate content formatting
  validateContent(content, fieldName) {
    if (typeof content !== 'string') {
      this.error(`${fieldName} must be a string`);
      return;
    }

    // Check for proper markdown formatting
    if (!content.includes('**')) {
      this.warning(`${fieldName} should use **bold** formatting for headers`);
    }

    if (!content.includes('☐')) {
      this.warning(`${fieldName} should use ☐ for checkboxes`);
    }

    // Check for proper section structure
    const sections = ['What to do:', 'Why it matters:', 'What you need:', 'Where/how:', 'Cost & time:', 'Ready when:'];
    const missingSections = sections.filter(section => !content.includes(section));
    if (missingSections.length > 0) {
      this.warning(`${fieldName} missing recommended sections: ${missingSections.join(', ')}`);
    }
  }

  // Test PDF accessibility
  async testPdfAccessibility(pdfUrl, formId) {
    if (this.validatedPdfs.has(pdfUrl)) {
      return this.validatedPdfs.get(pdfUrl);
    }

    return new Promise((resolve) => {
      const url = new URL(pdfUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const request = client.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CountyValidator/1.0)'
        }
      }, (response) => {
        if (response.statusCode === 200) {
          const contentType = response.headers['content-type'];
          if (contentType && contentType.includes('application/pdf')) {
            this.success(`PDF accessible: ${formId}`);
            this.validatedPdfs.set(pdfUrl, true);
            resolve(true);
          } else {
            this.error(`PDF URL does not return PDF content: ${pdfUrl} (Content-Type: ${contentType})`);
            this.validatedPdfs.set(pdfUrl, false);
            resolve(false);
          }
        } else if (response.statusCode === 403) {
          this.warning(`PDF URL requires authentication or special access: ${pdfUrl} (Status: ${response.statusCode})`);
          this.warning(`This is common for county websites. Please verify the URL is correct and accessible.`);
          this.validatedPdfs.set(pdfUrl, 'needs_verification');
          resolve('needs_verification');
        } else {
          this.error(`PDF URL returned status ${response.statusCode}: ${pdfUrl}`);
          this.validatedPdfs.set(pdfUrl, false);
          resolve(false);
        }
      });

      request.on('error', (err) => {
        this.error(`Failed to access PDF: ${pdfUrl} - ${err.message}`);
        this.validatedPdfs.set(pdfUrl, false);
        resolve(false);
      });

      request.on('timeout', () => {
        this.error(`PDF URL timeout: ${pdfUrl}`);
        request.destroy();
        this.validatedPdfs.set(pdfUrl, false);
        resolve(false);
      });
    });
  }

  // Validate all PDFs
  async validatePdfs(steps) {
    this.info('Testing PDF accessibility...');
    
    const pdfSteps = steps.filter(step => step.type === 'pdf' && step.pdfUrl);
    
    if (pdfSteps.length === 0) {
      this.warning('No PDF steps found to validate');
      return;
    }

    let hasErrors = false;
    let needsVerification = false;
    
    for (const step of pdfSteps) {
      const result = await this.testPdfAccessibility(step.pdfUrl, step.formId);
      if (result === false) hasErrors = true;
      if (result === 'needs_verification') needsVerification = true;
    }
    
    if (needsVerification && !hasErrors) {
      this.warning('Some PDFs require manual verification but URLs appear to be in correct format');
    }
  }

  // Validate root domain format
  validateRootDomain(rootDomain) {
    if (!rootDomain) {
      this.error('rootDomain is required');
      return;
    }

    if (typeof rootDomain !== 'string') {
      this.error('rootDomain must be a string');
      return;
    }

    // Check for protocol
    if (rootDomain.startsWith('http://') || rootDomain.startsWith('https://')) {
      this.error('rootDomain should not include protocol (http:// or https://)');
    }

    // Check for www
    if (rootDomain.startsWith('www.')) {
      this.warning('rootDomain should not include www prefix');
    }

    // Basic domain validation
    if (!rootDomain.includes('.')) {
      this.error('rootDomain appears to be invalid (no dots found)');
    }

    this.success(`Root domain validated: ${rootDomain}`);
  }

  // Main validation function
  async validate(data, filename) {
    this.log(`\n${colors.bright}${colors.cyan}Validating: ${filename}${colors.reset}\n`);
    
    // Reset state
    this.errors = [];
    this.warnings = [];

    // Validate structure
    this.validateStructure(data);
    
    // Validate steps
    this.validateSteps(data.steps, data.id);
    
    // Validate root domain
    this.validateRootDomain(data.rootDomain);
    
    // Test PDF accessibility
    await this.validatePdfs(data.steps);

    // Summary
    this.log(`\n${colors.bright}${colors.cyan}Validation Summary${colors.reset}`);
    this.log(`Errors: ${this.errors.length}`);
    this.log(`Warnings: ${this.warnings.length}`);
    
    if (this.errors.length === 0) {
      this.success('✅ County data is valid and ready for upload!');
      return true;
    } else {
      this.error('❌ County data has validation errors and should not be uploaded');
      return false;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
County Data Validation Script

Usage:
  node scripts/validate-county-data.js <county-file.json>
  node scripts/validate-county-data.js --all
  node scripts/validate-county-data.js --help

Examples:
  node scripts/validate-county-data.js data/alameda_county_mehko.json
  node scripts/validate-county-data.js --all

Options:
  --all     Validate all county files in data/ directory
  --help    Show this help message
`);
    process.exit(0);
  }

  const validator = new CountyValidator();
  let allValid = true;

  if (args[0] === '--all') {
    // Validate all county files
    const dataDir = path.join(__dirname, '..', 'data');
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json') && file !== 'manifest.json' && file !== 'county-template.json' && file !== 'example-county.json');
    
    if (files.length === 0) {
      validator.log('No county files found in data/ directory', 'yellow');
      process.exit(0);
    }

    validator.log(`Found ${files.length} county files to validate\n`, 'cyan');

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const isValid = await validator.validate(data, file);
        if (!isValid) allValid = false;
      } catch (err) {
        validator.error(`Failed to parse ${file}: ${err.message}`);
        allValid = false;
      }
    }
  } else {
    // Validate single file
    const filePath = path.resolve(args[0]);
    
    if (!fs.existsSync(filePath)) {
      validator.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      allValid = await validator.validate(data, path.basename(filePath));
    } catch (err) {
      validator.error(`Failed to parse JSON: ${err.message}`);
      process.exit(1);
    }
  }

  process.exit(allValid ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Validation failed:', err);
    process.exit(1);
  });
}

export default CountyValidator;
