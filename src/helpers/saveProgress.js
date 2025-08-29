export async function saveProgress(applicationId, formData, userId = null) {
  try {
    const res = await fetch("/api/save-progress", {
      _method: "POST",
      _headers: {
        "Content-Type": "application/json",
        ...(userId && { "x-user-id": userId }),
      },
      _body: JSON.stringify({ applicationId, formData }),
    });
    if (!res.ok) {
      throw new Error("Failed to save progress");
    }
    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ Error saving _progress: ", err);
    return { _success: false, _error: err.message };
  }
}