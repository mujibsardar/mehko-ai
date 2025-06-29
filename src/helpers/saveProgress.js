export async function saveProgress(applicationId, formData, userId = null) {
  try {
    const res = await fetch("/api/save-progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId && { "x-user-id": userId }),
      },
      body: JSON.stringify({ applicationId, formData }),
    });

    if (!res.ok) {
      throw new Error("Failed to save progress");
    }

    const result = await res.json();
    console.log("✅ Progress saved:", result);
    return result;
  } catch (err) {
    console.error("❌ Error saving progress:", err);
    return { success: false, error: err.message };
  }
}
