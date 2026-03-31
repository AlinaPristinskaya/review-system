const API_BASE_URL = window.location.port === "3000"
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : "";

export const sourceLabels = {
  SPA: "SPA",
  REVIEW1: "Review1",
  REVIEW2: "Review2",
  REVIEW3: "Review3",
  REVIEW4: "Review4",
  REVIEW5: "Review5",
  REVIEW6: "Review6",
  REVIEW7: "Review7"
};

export async function fetchProgress() {
  const response = await fetch(`${API_BASE_URL}/api/progress`);
  if (!response.ok) {
    throw new Error("Failed to load progress data.");
  }

  return response.json();
}

export async function updateProgressCell(subcategoryId, sourceCode, value, factor = 1) {
  const response = await fetch(`${API_BASE_URL}/api/progress/subcategories/${subcategoryId}/sources/${sourceCode}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ value, factor })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to update progress data.");
  }
}
