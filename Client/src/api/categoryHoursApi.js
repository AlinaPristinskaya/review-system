import { getApiBaseUrl } from "./baseUrl";

const API_BASE_URL = getApiBaseUrl();

export async function fetchCategoryHours() {
  const response = await fetch(`${API_BASE_URL}/api/category-hours`);
  if (!response.ok) {
    throw new Error("Failed to load category hours.");
  }

  return response.json();
}

export async function updateCategoryHours(rows) {
  const response = await fetch(`${API_BASE_URL}/api/category-hours`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ rows })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to update category hours.");
  }
}
