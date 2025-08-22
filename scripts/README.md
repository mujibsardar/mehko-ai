# MEHKO AI Agent

## Overview

The MEHKO AI Agent automatically crawls county government websites and generates complete MEHKO application JSON files.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set OpenAI API Key

Create a `.env` file in your project root:
```bash
# Create .env file
echo "OPENAI_API_KEY=your_actual_api_key_here" > .env
```

Or manually create `.env` with:
```
OPENAI_API_KEY=your_actual_api_key_here
```

**Note**: The `.env` file is already in `.gitignore` for security.

## Usage

### Basic Usage

```bash
node scripts/mehko-agent.mjs "https://county-website-url.com/mehko"
```

### Example

```bash
node scripts/mehko-agent.mjs "https://www.sandiegocounty.gov/content/sdc/deh/fhd/food/homekitchenoperations.html"
```

## What It Does

1. **🕷️ Crawls** the county website
2. **🤖 Uses AI** to extract and structure information
3. **📄 Generates** complete JSON application file
4. **💰 Cost-effective** (~$0.06-0.12 per county)

## Output

Creates a file like `generated_san_diego_mehko.json` in your project root.

## Integration

After generation, use the add-county script to add it to your manifest:

```bash
node scripts/add-county.mjs generated_san_diego_mehko.json
```

## Requirements

- OpenAI API key
- Node.js with ES modules support
- Internet connection for web crawling
