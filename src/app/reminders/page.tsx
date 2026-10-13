import type { Metadata } from 'next';
import { RemindersView } from '@/components/RemindersView';

export const metadata: Metadata = { title: 'Reminders' };

export default function Page() {
  return <RemindersView />;
}
