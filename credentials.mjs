const encoder = new TextEncoder();

export function normalizePart(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeRegistry(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function composeRegistration(name, vestige, data) {
  return normalizePart(name) + String(vestige).toLowerCase() + data.map(normalizePart).join('');
}

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function registryEmail(registry) {
  return (await digest('codex:registry:v1:' + normalizeRegistry(registry))) + '@agenciados.invalid';
}

export async function passwordToken(password) {
  // Preserve every character, including the final character of long puzzle passwords.
  return digest('codex:password:v1:' + password);
}
