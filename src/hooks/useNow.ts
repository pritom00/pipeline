'use client';

import { useEffect, useState } from 'react';

/** Current time, refreshed every minute so "3d ago" and stale flags stay honest. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
