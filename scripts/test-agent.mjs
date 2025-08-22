#!/usr/bin/env node
import { EnhancedMEHKOAgent } from './mehko-agent-enhanced.mjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAgent() {
  console.log('🧪 Testing Enhanced MEHKO Agent...\n');
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not found in .env file");
    console.error("Please create a .env file with your OpenAI API key");
    process.exit(1);
  }
  
  console.log('✅ OpenAI API key found');
  console.log('✅ Dependencies loaded');
  console.log('✅ Agent class imported');
  
  // Test validation function
  console.log('\n🔍 Testing validation function...');
  
  const testApp = {
    id: "test_county_mehko",
    title: "Test County MEHKO",
    description: "Test description",
    rootDomain: "test.gov",
    supportTools: { aiEnabled: true, commentsEnabled: true },
    steps: [
      { id: "planning_overview", title: "Plan", type: "info", action_required: false, fill_pdf: false, content: "test" },
      { id: "approvals_training", title: "Approvals", type: "info", action_required: true, fill_pdf: false, content: "test" },
      { id: "prepare_docs", title: "Docs", type: "info", action_required: true, fill_pdf: false, content: "test" },
      { id: "sop_form", title: "SOP", type: "pdf", formId: "TEST_SOP", appId: "test_county_mehko", action_required: true, fill_pdf: true, content: "test" },
      { id: "permit_application_form", title: "Permit", type: "pdf", formId: "TEST_PERMIT", appId: "test_county_mehko", action_required: true, fill_pdf: true, content: "test" },
      { id: "submit_application", title: "Submit", type: "info", action_required: true, fill_pdf: false, content: "test" },
      { id: "inspection", title: "Inspection", type: "info", action_required: true, fill_pdf: false, content: "test" },
      { id: "receive_permit", title: "Permit", type: "info", action_required: false, fill_pdf: false, content: "test" },
      { id: "operate_comply", title: "Comply", type: "info", action_required: true, fill_pdf: false, content: "test" },
      { id: "contact", title: "Contact", type: "info", action_required: false, fill_pdf: false, content: "test" }
    ]
  };
  
  const agent = new EnhancedMEHKOAgent(apiKey);
  const validation = agent.validateApplication(testApp);
  
  if (validation.isValid) {
    console.log('✅ Validation test passed');
  } else {
    console.log('❌ Validation test failed:', validation.errors);
  }
  
  console.log('\n🎯 Agent is ready for use!');
  console.log('\n💡 Usage examples:');
  console.log('  Single county: node scripts/mehko-agent-enhanced.mjs "https://county.gov/mehko" "County Name"');
  console.log('  Batch mode: node scripts/mehko-agent-enhanced.mjs --batch data/county-batch.json');
  console.log('\n🚀 Ready to create MEHKO applications!');
}

testAgent().catch(console.error);
