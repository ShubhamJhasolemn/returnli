function Bar({ className = '' }) {
    return <div className={`animate-pulse rounded bg-slate-800 ${className}`} />
  }
  
  export function ListSkeleton() {
    return (
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
        <ul className="divide-y divide-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="px-4 py-4">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
                <Bar className="h-4 w-24 md:col-span-2" />
                <div className="md:col-span-3">
                  <Bar className="h-4 w-40" />
                  <Bar className="mt-1 h-3 w-28" />
                </div>
                <Bar className="h-4 w-28 md:col-span-2" />
                <Bar className="h-4 w-20 md:col-span-2" />
                <Bar className="h-5 w-16 rounded-full md:col-span-2" />
                <Bar className="h-4 w-10 md:col-span-1 md:ml-auto" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  
  export function DetailSkeleton() {
    return (
      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Bar className="h-3 w-20" />
              <Bar className="mt-2 h-4 w-36" />
            </div>
          ))}
        </div>
        <Bar className="h-9 w-40" />
      </div>
    )
  }