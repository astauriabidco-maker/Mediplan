import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import type { ElementType } from 'react';
import { cn } from '../utils/cn';

type IconType = ElementType<{ size?: string | number; className?: string }>;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

export const SkeletonBlock = ({
  className,
}: {
  className?: string;
}) => (
  <div
    aria-hidden="true"
    className={cn(
      'animate-pulse rounded-lg border border-slate-800 bg-slate-900',
      className,
    )}
  />
);

export const PageSkeleton = ({
  title = 'Chargement',
  rows = 3,
  sidePanel = false,
}: {
  title?: string;
  rows?: number;
  sidePanel?: boolean;
}) => (
  <div className="mx-auto max-w-[1500px] space-y-6 pb-16" role="status" aria-label={title}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="space-y-3">
        <SkeletonBlock className="h-8 w-72 max-w-full" />
        <SkeletonBlock className="h-4 w-[34rem] max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-10 w-24" />
        <SkeletonBlock className="h-10 w-24" />
        <SkeletonBlock className="h-10 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <SkeletonBlock key={item} className="h-24" />
      ))}
    </div>
    <div className={cn('grid grid-cols-1 gap-5', sidePanel && 'xl:grid-cols-[minmax(0,1fr)_420px]')}>
      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonBlock key={index} className="h-24" />
        ))}
      </div>
      {sidePanel && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-5">
          <SkeletonBlock className="h-7 w-2/3" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-36" />
        </div>
      )}
    </div>
    <span className="sr-only">{title}</span>
  </div>
);

export const EmptyState = ({
  title,
  message,
  icon: Icon = AlertTriangle,
  tone = 'slate',
  compact = false,
}: {
  title: string;
  message: string;
  icon?: IconType;
  tone?: 'slate' | 'emerald' | 'amber';
  compact?: boolean;
}) => {
  const toneClass = {
    slate: 'text-slate-500 border-slate-800',
    emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
    amber: 'text-amber-300 border-amber-500/30 bg-amber-500/5',
  }[tone];

  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed text-center', compact ? 'min-h-[120px] p-5' : 'min-h-[260px] p-8', toneClass)}>
      <Icon size={compact ? 28 : 40} className="shrink-0" />
      <h3 className={cn('mt-4 font-bold text-white', compact ? 'text-sm' : 'text-lg')}>{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{message}</p>
    </div>
  );
};

export const ApiErrorState = ({
  title,
  message,
  onRetry,
  retryLabel = 'Réessayer',
  isRetrying = false,
  compact = false,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
  compact?: boolean;
}) => (
  <div
    className={cn(
      'rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-100',
      compact ? 'space-y-3 p-4 text-sm' : 'space-y-4 p-6',
    )}
    role="alert"
  >
    <div className="flex items-start gap-3">
      <AlertTriangle size={compact ? 18 : 22} className="mt-0.5 shrink-0 text-rose-300" />
      <div>
        {title && <div className="font-bold">{title}</div>}
        <p className={cn('text-rose-100/85', title && 'mt-1 text-sm')}>{message}</p>
      </div>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        aria-label={retryLabel}
        className={cn(
          'inline-flex items-center gap-2 rounded-md bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-50 hover:bg-rose-500/30 disabled:cursor-wait disabled:opacity-70',
          focusRing,
        )}
      >
        {isRetrying ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        {retryLabel}
      </button>
    )}
  </div>
);
