export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Headers": "content-type,authorization",
};

export function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = fetch(resource, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(id));

  response.abort = () => controller.abort();
  return response;
}
