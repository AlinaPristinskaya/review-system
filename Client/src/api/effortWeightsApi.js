const API_BASE_URL = window.location.port === "3000"
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : "";

export async function fetchEffortWeights() {
  const response = await fetch(`${API_BASE_URL}/api/effort-weights`);
  if (!response.ok) {
    throw new Error("Failed to load effort weights.");
  }

  return response.json();
}

export async function updateEffortWeights(rows) {
  const response = await fetch(`${API_BASE_URL}/api/effort-weights`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ rows })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to update effort weight.");
  }
}
