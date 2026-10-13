/** Short unique id. Works in insecure contexts where crypto.randomUUID is missing. */
export function newId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '').slice(0, 16);
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Human-shareable room key, e.g. "k3f9-x7qa-m2zp". */
export function newRoomKey(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  const part = () => Array.from({ length: 4 }, pick).join('');
  return `${part()}-${part()}-${part()}`;
}
