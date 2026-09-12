type SummaryCardProps = {
  label: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
};

export function SummaryCard({
  label,
  value,
  description,
  icon,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </span>

        <div className="rounded-xl bg-zinc-100 p-2 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {icon}
        </div>
      </div>

      <div className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
        {value}
      </div>

      {description && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}
