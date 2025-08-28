#!/bin/bash

echo "🧹 Resetting AcroForm test data..."
echo "=================================="

# 1. Clear all overlay.json files (they're empty anyway)
echo "🗑️  Clearing overlay.json files..."
find applications -name "overlay.json" -exec rm {} \;

# 2. Clear any existing AcroForm PDFs
echo "🗑️  Clearing existing AcroForm PDFs..."
find applications -name "form_acroform.pdf" -exec rm {} \;

# 3. Clear Firebase form data (optional - requires user confirmation)
echo ""
echo "🔥 Firebase Data Cleanup Options:"
echo "1. Clear all user form data (WARNING: This will delete all saved form progress)"
echo "2. Clear only test user data"
echo "3. Skip Firebase cleanup"
echo ""
read -p "Choose option (1-3): " firebase_option

case $firebase_option in
    1)
        echo "🗑️  Clearing ALL Firebase form data..."
        node scripts/clear-form-data.mjs --all
        ;;
    2)
        echo "🗑️  Clearing test user Firebase form data..."
        node scripts/clear-form-data.mjs --test-users
        ;;
    3)
        echo "⏭️  Skipping Firebase cleanup"
        ;;
    *)
        echo "❌ Invalid option, skipping Firebase cleanup"
        ;;
esac

# 4. Create test overlay data for one form
echo ""
echo "🧪 Creating test overlay data..."
mkdir -p applications/los_angeles_county_mehko/forms/MEHKO_SOP-English/

cat > applications/los_angeles_county_mehko/forms/MEHKO_SOP-English/overlay.json << 'EOF'
{
  "fields": [
    {
      "id": "business_name",
      "label": "Business Name",
      "type": "text",
      "page": 0,
      "rect": [100, 200, 300, 220],
      "fontSize": 12,
      "align": "left"
    },
    {
      "id": "owner_name",
      "label": "Owner Name",
      "type": "text", 
      "page": 0,
      "rect": [100, 250, 300, 270],
      "fontSize": 12,
      "align": "left"
    },
    {
      "id": "address",
      "label": "Business Address",
      "type": "text",
      "page": 0,
      "rect": [100, 300, 350, 320],
      "fontSize": 12,
      "align": "left"
    },
    {
      "id": "phone",
      "label": "Phone Number",
      "type": "text",
      "page": 0,
      "rect": [100, 350, 250, 370],
      "fontSize": 12,
      "align": "left"
    },
    {
      "id": "email",
      "label": "Email Address",
      "type": "text",
      "page": 0,
      "rect": [100, 400, 300, 420],
      "fontSize": 12,
      "align": "left"
    },
    {
      "id": "signature",
      "label": "Signature",
      "type": "signature",
      "page": 0,
      "rect": [100, 500, 250, 550],
      "fontSize": 12,
      "align": "left"
    },
    {
      "id": "date",
      "label": "Date",
      "type": "text",
      "page": 0,
      "rect": [100, 550, 200, 570],
      "fontSize": 12,
      "align": "left"
    }
  ]
}
EOF

echo "✅ Test overlay data created!"

# 5. Test AcroForm creation
echo ""
echo "🧪 Testing AcroForm creation..."
curl -X POST "http://localhost:8000/apps/los_angeles_county_mehko/forms/MEHKO_SOP-English/create-acroform" \
  -H "Content-Type: application/json" \
  --output /tmp/test-acroform.pdf

if [ -s /tmp/test-acroform.pdf ]; then
    echo "✅ AcroForm creation successful!"
    echo "📄 Test AcroForm saved to /tmp/test-acroform.pdf"
else
    echo "❌ AcroForm creation failed"
fi

echo ""
echo "🎉 Reset complete! You can now test the AcroForm functionality."
echo ""
echo "📋 Next steps:"
echo "1. Visit: http://localhost:5173"
echo "2. Navigate to a form (e.g., SOP form)"
echo "3. Test the new AcroForm viewer interface"
echo "4. Try filling fields and downloading the filled PDF"
echo ""
echo "🔧 If you need to clear Firebase data manually:"
echo "   node scripts/clear-form-data.mjs --help"
