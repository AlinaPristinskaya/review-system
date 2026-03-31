const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

export function getApiBaseUrl() {
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (window.location.port === "3000" || window.location.port === "4173") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return "";
}
