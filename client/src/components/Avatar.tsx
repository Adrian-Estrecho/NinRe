const TONES = ["#2f80ed", "#ff5c7c", "#7c5cff", "#2fb36b", "#e8743b", "#1f8a8a"];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

/** A person as a coloured circle with their initials. */
export function Avatar({ name, id, size = 32 }: { name: string; id?: string; size?: number }) {
  return (
    <span className="avatar" style={{ background: TONES[hash(id ?? name) % TONES.length], width: size, height: size, fontSize: size * 0.4 }} title={name} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** "Mara", "Mara & Josh", "Mara, Josh & Kai", "Mara, Josh & 3 others" */
export function joinNames(names: string[]): string {
  const first = names.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean);
  if (first.length <= 1) return first.join("");
  if (first.length <= 3) return `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}`;
  return `${first.slice(0, 2).join(", ")} & ${first.length - 2} others`;
}
