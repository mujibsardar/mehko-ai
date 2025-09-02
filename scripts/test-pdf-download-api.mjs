import fetch from "node-fetch";

async function testPdfDownloadAPI() {
  const baseUrl = "http://localhost"; // Docker with Caddy
  const testData = {
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    appId: "test_county_mehko",
    formId: "test_form",
  };

  console.log("Testing PDF download API endpoint...");
  console.log("URL:", `${baseUrl}/api/download-pdf`);
  console.log("Test data:", testData);

  try {
    const response = await fetch(`${baseUrl}/api/download-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ PDF download API is working!");
      console.log("Response:", result);

      // Check if file was created
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(
        "applications",
        testData.appId,
        "forms",
        testData.formId,
        "form.pdf"
      );

      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ PDF file created successfully at: ${filePath}`);
        console.log(`File size: ${stats.size} bytes`);
      } else {
        console.log("⚠️  PDF file was not created");
      }
    } else {
      const error = await response.json().catch(() => ({}));
      console.log("❌ PDF download API failed");
      console.log("Status:", response.status);
      console.log("Error:", error);
    }
  } catch (error) {
    console.log("❌ Error testing PDF download API:", error.message);
  }
}

testPdfDownloadAPI();
