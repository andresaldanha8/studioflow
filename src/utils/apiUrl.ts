// Helper to prefix API paths with VITE_API_BASE_URL when available
export function apiUrl(path: string) {
  const base = (import.meta as any).env.VITE_API_BASE_URL || "";
  return `${base}${path}`;
}
