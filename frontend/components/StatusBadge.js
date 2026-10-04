const STYLES = {
    open: 'bg-slate-700/40 text-slate-300',
    in_review: 'bg-amber-500/15 text-amber-300',
    approved: 'bg-blue-500/15 text-blue-300',
    rejected: 'bg-red-500/15 text-red-300',
    completed: 'bg-emerald-500/15 text-emerald-300',
  }
  const LABELS = {
    open: 'Open', in_review: 'In Review', approved: 'Approved',
    rejected: 'Rejected', completed: 'Completed',
  }
  
  export function StatusBadge({ status }) {
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? 'bg-slate-700/40 text-slate-300'}`}>
        {LABELS[status] ?? status}
      </span>
    )
  }