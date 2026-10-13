export function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your applications" className="flex gap-5 overflow-hidden">
      {[3, 3, 2, 3, 2].map((n, i) => (
        <div key={i} className="lane flex w-[280px] shrink-0 flex-col gap-3 rounded-2xl p-3">
          <div className="skeleton h-4 w-24 rounded-md" />
          {Array.from({ length: n }, (_, j) => (
            <div key={j} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      <div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  );
}
