import { newRoomKey } from './id';

const KEY = 'pipeline:room';
export const ROOM_PATTERN = /^[a-z0-9][a-z0-9-]{3,63}$/;

export function getRoom(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && ROOM_PATTERN.test(saved)) return saved;
    const fresh = newRoomKey();
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return 'local';
  }
}

export function setRoom(room: string): boolean {
  const clean = room.trim().toLowerCase();
  if (!ROOM_PATTERN.test(clean)) return false;
  try {
    localStorage.setItem(KEY, clean);
    return true;
  } catch {
    return false;
  }
}
