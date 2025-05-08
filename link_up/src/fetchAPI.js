import API from "./api"; // ✅ import your base URL

export async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  };

  const finalOptions = {
    ...options,
    headers,
  };

  const fullUrl = endpoint.startsWith("http") ? endpoint : `${API}${endpoint}`;

  const res = await fetch(fullUrl, finalOptions);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(errorData.message || "API fetch failed");
    error.status = res.status;
    throw error;
  }

  return res.json();
}