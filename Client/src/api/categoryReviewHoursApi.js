const API_BASE_URL = window.location.port === "3000"
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : "";

export async function fetchCategoryReviewHours() {
  const response = await fetch(`${API_BASE_URL}/api/category-review-hours`);
  if (!response.ok) {
    throw new Error("Failed to load review hour plan.");
  }

  return response.json();
}

export async function updateCategoryReviewHours(rows) {
  const response = await fetch(`${API_BASE_URL}/api/category-review-hours`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ rows })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to update review hour plan.");
  }
}
