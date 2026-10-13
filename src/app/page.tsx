import { Suspense } from 'react';
import { Board } from '@/components/Board';
import { BoardSkeleton } from '@/components/Skeletons';

export default function Page() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Board />
    </Suspense>
  );
}
