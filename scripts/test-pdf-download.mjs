import fetch from "node-fetch";

async function testPdfDownload() {
  const baseUrl = "http://localhost:3000"; // Adjust if your server runs on different port
  const testUrl = `${baseUrl}/api/apps/los_angeles_mehko/forms/MEHKO_SOP-English/pdf`;
  
  console.log("Testing PDF download endpoint...");
  console.log("URL:", testUrl);
  
  try {
    const response = await fetch(testUrl);
    
    if (response.ok) {
      console.log("✅ PDF download endpoint is working!");
      console.log("Status:", response.status);
      console.log("Content-Type:", response.headers.get("content-type"));
      console.log("Content-Length:", response.headers.get("content-length"));
      
      // Check if it's actually a PDF
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/pdf")) {
        console.log("✅ Response is a valid PDF file");
      } else {
        console.log("⚠️  Response is not a PDF file");
      }
    } else {
      console.log("❌ PDF download failed");
      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);
    }
  } catch (error) {
    console.log("❌ Error testing PDF download:", error.message);
  }
}

testPdfDownload();
