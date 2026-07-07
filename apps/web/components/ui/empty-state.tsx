type EmptyStateProps = {
  title: string;
  detail: string;
};

export function EmptyState({ title, detail }: EmptyStateProps) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}
