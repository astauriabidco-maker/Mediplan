import { AlertTriangle, Ban, ShieldCheck } from 'lucide-react';
import {
  SPRINT36_COMMERCIAL_DEMO_LABEL,
  SPRINT36_COMMERCIAL_DEMO_NOTICE,
  isSprint36CommercialDemoTenant,
} from '../lib/sprint36CommercialDemo';

interface Sprint36CommercialDemoBannerProps {
  tenantId?: string | null;
}

export const Sprint36CommercialDemoBanner = ({
  tenantId,
}: Sprint36CommercialDemoBannerProps) => {
  if (!isSprint36CommercialDemoTenant(tenantId)) return null;

  return (
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-amber-50"
      role="status"
      aria-label="Mode demo commerciale actif"
    >
      <div className="flex min-w-0 items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-wide text-amber-100">
            {SPRINT36_COMMERCIAL_DEMO_LABEL} - {tenantId}
          </p>
          <p className="text-sm text-amber-100/80">
            {SPRINT36_COMMERCIAL_DEMO_NOTICE}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-100">
        <span className="inline-flex items-center gap-1 rounded bg-slate-950/40 px-2 py-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Tenant separe
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-slate-950/40 px-2 py-1">
          <Ban className="h-3.5 w-3.5" />
          Imports/exports sensibles bloques
        </span>
      </div>
    </div>
  );
};
