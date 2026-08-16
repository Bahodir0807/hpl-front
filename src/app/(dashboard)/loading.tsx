export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="space-y-2">
        <div className="h-7 w-64 rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>

      <div className="rounded border border-slate-200 bg-white p-3">
        <div className="h-9 w-full max-w-md rounded bg-slate-200" />
      </div>

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-4 flex-1 rounded bg-slate-200"
              />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4 border-b border-slate-100 px-3 py-3 last:border-b-0"
          >
            {Array.from({ length: 5 }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 flex-1 rounded bg-slate-200"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
