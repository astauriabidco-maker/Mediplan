import { AlertCircle, ArrowRight } from 'lucide-react';
import type { ManagerWorklistItem } from '../../api/manager.api';

const severityClass: Record<string, string> = {
  HIGH: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  MEDIUM: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  LOW: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
};

export const ManagerWorklistPanel = ({
  items,
}: {
  items: ManagerWorklistItem[];
}) => (
  <section aria-labelledby="manager-worklist-panel-title" className="border border-slate-800 bg-slate-900">
    <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
      <div>
        <h2 id="manager-worklist-panel-title" className="text-base font-bold text-white">File de correction</h2>
        <p className="text-xs text-slate-500">
          Priorités issues de la conformité planning.
        </p>
      </div>
      <AlertCircle aria-hidden="true" className="text-slate-500" size={20} />
    </div>

    <div className="divide-y divide-slate-800">
      {items.length === 0 && (
        <div className="px-5 py-8 text-sm text-slate-500">
          Aucune correction prioritaire.
        </div>
      )}

      {items.slice(0, 6).map((item) => (
        <div key={item.id} className="flex items-center gap-4 px-5 py-4">
          <span
            className={`shrink-0 border px-2 py-1 text-[11px] font-bold ${
              severityClass[item.severity] || severityClass.LOW
            }`}
          >
            {item.severity}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">
              {item.title}
            </p>
            <p className="truncate text-xs text-slate-500">
              {item.category} · {item.ruleCode}
            </p>
          </div>
          <ArrowRight aria-hidden="true" className="text-slate-600" size={18} />
        </div>
      ))}
    </div>
  </section>
);
