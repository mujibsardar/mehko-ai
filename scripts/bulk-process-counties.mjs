#!/usr/bin/env node

/**
 * Bulk Process Counties
 * 
 * This script automatically processes all county JSON files in the data directory:
 * 1. Finds all county JSON files
 * 2. Processes each one automatically
 * 3. Downloads all PDF forms
 * 4. Updates the manifest
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import CountyProcessor from './auto-process-county.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.join(__dirname, '../data');

class BulkCountyProcessor {
  constructor() {
    this.processor = new CountyProcessor();
    this.processedCounties = [];
    this.failedCounties = [];
  }

  async findCountyFiles() {
    try {
      const files = await fs.readdir(DATA_DIR);
      const countyFiles = files.filter(file => 
        file.endsWith('.json') && 
        file !== 'manifest.json' && 
        file !== 'county-template.json' &&
        file !== 'example-county.json' &&
        file !== 'county-batch.json'
      );
      
      console.log(`🔍 Found ${countyFiles.length} county files to process`);
      return countyFiles.map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('❌ Failed to read data directory:', error.message);
      throw error;
    }
  }

  async processCounty(countyId) {
    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🚀 Processing: ${countyId}`);
      console.log(`${'='.repeat(50)}`);
      
      await this.processor.processCounty(countyId);
      this.processedCounties.push(countyId);
      
      console.log(`✅ ${countyId} processed successfully`);
      
    } catch (error) {
      console.error(`❌ ${countyId} failed:`, error.message);
      this.failedCounties.push({ countyId, error: error.message });
    }
  }

  async processAllCounties() {
    try {
      const countyIds = await this.findCountyFiles();
      
      if (countyIds.length === 0) {
        console.log('ℹ️  No county files found to process');
        return;
      }

      console.log(`🚀 Starting bulk processing of ${countyIds.length} counties...`);
      
      for (const countyId of countyIds) {
        await this.processCounty(countyId);
      }
      
      this.printSummary();
      
    } catch (error) {
      console.error('💥 Bulk processing failed:', error.message);
      process.exit(1);
    }
  }

  printSummary() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 BULK PROCESSING COMPLETED`);
    console.log(`${'='.repeat(60)}`);
    
    console.log(`\n✅ Successfully Processed (${this.processedCounties.length}):`);
    this.processedCounties.forEach(countyId => {
      console.log(`   • ${countyId}`);
    });
    
    if (this.failedCounties.length > 0) {
      console.log(`\n❌ Failed to Process (${this.failedCounties.length}):`);
      this.failedCounties.forEach(({ countyId, error }) => {
        console.log(`   • ${countyId}: ${error}`);
      });
    }
    
    console.log(`\n📁 All applications are now available in the applications/ directory`);
    console.log(`📋 Manifest has been updated with all counties`);
    console.log(`📚 All PDF forms have been downloaded`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    console.log('Usage: node bulk-process-counties.mjs');
    console.log('This script processes ALL county JSON files automatically');
    process.exit(1);
  }

  const bulkProcessor = new BulkCountyProcessor();
  await bulkProcessor.processAllCounties();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default BulkCountyProcessor;
