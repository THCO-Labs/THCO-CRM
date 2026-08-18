/**
 * The badge an icon sits in, everywhere in the CRM.
 *
 * The dashboard settled this: a pale tinted circle with the icon drawn in the
 * accent colour. Unit pages had drifted to a solid gradient-filled rounded
 * square with a white icon, which reads as a different product the moment you
 * navigate — the same application should not change its mind about what an
 * icon looks like between one page and the next.
 *
 * Pages already describe each card with a Tailwind gradient (`from-cyan-500
 * to-blue-600`). Rather than rewrite every one of those lists, the first colour
 * is read out of the gradient and used as the accent, so the variety the pages
 * already have is kept and nothing about their data has to change.
 */

// Only the families actually used across the unit pages. Anything unrecognised
// falls back to the brand gold, which is what the dashboard's own stat cards use.
const TAILWIND_ACCENTS = {
  "slate-500": "#64748B", "gray-500": "#6B7280", "zinc-500": "#71717A",
  "red-500": "#EF4444", "orange-500": "#F97316", "amber-500": "#F59E0B",
  "yellow-500": "#EAB308", "lime-500": "#84CC16", "green-500": "#22C55E",
  "emerald-500": "#10B981", "emerald-600": "#059669", "teal-500": "#14B8A6",
  "cyan-500": "#06B6D4", "cyan-600": "#0891B2", "sky-500": "#0EA5E9",
  "blue-500": "#3B82F6", "blue-600": "#2563EB", "indigo-500": "#6366F1",
  "indigo-600": "#4F46E5", "violet-500": "#8B5CF6", "purple-500": "#A855F7",
  "purple-600": "#9333EA", "fuchsia-500": "#D946EF", "pink-500": "#EC4899",
  "pink-600": "#DB2777", "rose-500": "#F43F5E", "red-600": "#DC2626",
  "amber-600": "#D97706", "green-600": "#16A34A", "teal-600": "#0D9488",
  "orange-600": "#EA580C", "slate-600": "#475569",
};

const BRAND_GOLD = "#A9834E";

/** Pull a usable colour out of `from-cyan-500 to-blue-600` or `from-[#1FB58A] …`. */
export function accentFromGradient(gradient, fallback = BRAND_GOLD) {
  if (!gradient) return fallback;
  const from = String(gradient).split(/\s+/).find((c) => c.startsWith("from-"));
  if (!from) return fallback;
  const value = from.slice(5);
  // Arbitrary values are already hex: from-[#1FB58A]
  const arbitrary = value.match(/^\[(#[0-9a-fA-F]{3,8})\]$/);
  if (arbitrary) return arbitrary[1];
  return TAILWIND_ACCENTS[value] || fallback;
}

/**
 * Pull an accent out of whatever Tailwind class a page already uses to paint a
 * badge — `bg-amber-500`, `bg-[#1B4332]`, or a `from-… to-…` gradient.
 *
 * Callers pass the class they already had, so a page keeps its own colours and
 * only the treatment changes: solid fill with a white icon becomes a pale wash
 * with the icon drawn in that same colour.
 */
export function accentFromClass(cls, fallback = BRAND_GOLD) {
  if (!cls) return fallback;
  for (const token of String(cls).split(/\s+/)) {
    const arbitrary = token.match(/^(?:bg|from|text)-\[(#[0-9a-fA-F]{3,8})\]$/);
    if (arbitrary) return arbitrary[1];
    const named = token.match(/^(?:bg|from|text)-([a-z]+-\d{2,3})$/);
    if (named && TAILWIND_ACCENTS[named[1]]) return TAILWIND_ACCENTS[named[1]];
  }
  return fallback;
}

export default function IconBadge({
  icon: Icon,
  accent,
  gradient,
  size = 44,
  className = "",
  ...rest
}) {
  const colour = accent || accentFromGradient(gradient);
  const iconSize = Math.round(size * 0.42);
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        // The dashboard's proportions: an 8% wash behind the icon and a 20%
        // border, so the badge reads as tinted paper rather than a filled chip.
        backgroundColor: `${colour}14`,
        border: `1px solid ${colour}33`,
      }}
      {...rest}
    >
      {Icon ? <Icon style={{ color: colour, width: iconSize, height: iconSize }} strokeWidth={1.7} /> : null}
    </div>
  );
}
