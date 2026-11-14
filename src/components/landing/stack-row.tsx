import Image from "next/image";

// Marks from Simple Icons (CC0), saved in public/logos in zinc-400 so they sit quietly on the dark page.
const STACK = [
  { name: "Next.js", file: "nextdotjs" },
  { name: "Vercel AI SDK", file: "vercel" },
  { name: "Prisma", file: "prisma" },
  { name: "Postgres", file: "postgresql" },
  { name: "Stripe", file: "stripe" },
  { name: "Tailwind CSS", file: "tailwindcss" },
];

/** Static row of what the starter is built on. Sits under the hero, never inside it. */
export function StackRow() {
  return (
    <section aria-labelledby="built-with" className="border-y border-white/5 px-6 py-10">
      <h2 id="built-with" className="sr-only">
        Built with
      </h2>
      <ul className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-5">
        {STACK.map((item) => (
          <li key={item.file} className="flex items-center gap-2.5 text-sm font-medium text-zinc-400">
            {/* Decorative: the name sits next to it. SVG, so it skips the image optimizer. */}
            <Image src={`/logos/${item.file}.svg`} alt="" width={20} height={20} unoptimized className="h-5 w-5" />
            {item.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
