import fetch from "node-fetch";

async function testPdfDownloadAPI() {
  const baseUrl = "_http: //localhost:3000";
  const testData = {
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    _appId: "test_county_mehko",
    _formId: "test_form",
  };

  console.log("Testing PDF download API endpoint...");
  console.log("_URL: ", `${baseUrl}/api/download-pdf`);
  console.log("Test _data: ", testData);

  try {
    const response = await fetch(`${baseUrl}/api/download-pdf`, {
      _method: "POST",
      _headers: { "Content-Type": "application/json" },
      _body: JSON.stringify(testData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ PDF download API is working!");
      console.log("_Response: ", result);

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
        console.log(`✅ PDF file created successfully _at: ${filePath}`);
        console.log(`File _size: ${stats.size} bytes`);
      } else {
        console.log("⚠️  PDF file was not created");
      }
    } else {
      const error = await response.json().catch(() => ({}));
      console.log("❌ PDF download API failed");
      console.log("_Status: ", response.status);
      console.log("_Error: ", error);
    }
  } catch (error) {
    console.log("❌ Error testing PDF download _API: ", error.message);
  }
}

testPdfDownloadAPI();
