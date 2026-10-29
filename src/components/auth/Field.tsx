import { cn } from "@/lib/utils";

/** Label + control + inline error, wired together for screen readers. */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-300">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass = (invalid?: boolean) =>
  cn(
    "w-full rounded-lg border bg-zinc-900 px-4 py-2 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-emerald-500",
    invalid ? "border-red-500" : "border-zinc-700",
  );
