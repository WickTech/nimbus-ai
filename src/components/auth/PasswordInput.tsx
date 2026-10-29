"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { invalid?: boolean };

/** Password field with a show/hide toggle. Works inside plain server-action forms (it is just an <input>). */
export function PasswordInput({ className, invalid, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-lg border bg-zinc-900 px-4 py-2 pr-16 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-emerald-500",
          invalid ? "border-red-500" : "border-zinc-700",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
