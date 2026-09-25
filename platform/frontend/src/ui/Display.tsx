import type { ReactNode } from "react";

export type GlyphName =
  | "spark" | "grid" | "users" | "scroll" | "cards" | "map" | "shield"
  | "chevron" | "arrow" | "moon" | "heart" | "bolt" | "book" | "sword"
  | "bag" | "eye" | "clock" | "settings" | "star" | "menu" | "close";

const paths: Record<GlyphName, ReactNode> = {
  spark: <><path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z" /><path d="m19 17 .7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2H3Z" /><path d="M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v1h-3" /></>,
  scroll: <><path d="M6 4h13v15a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3" /><path d="M4 8h4m3 3h5m-5 4h5" /></>,
  cards: <><rect x="6" y="3" width="13" height="17" rx="2" /><path d="M3 7v13a2 2 0 0 0 2 2h11m-4-14 1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5L12 8Z" /></>,
  map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16" /></>,
  shield: <><path d="m12 2 8 3v6c0 5-3.2 8.5-8 11-4.8-2.5-8-6-8-11V5l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  heart: <path d="M20.8 8.1c0 4.2-8.8 10.5-8.8 10.5S3.2 12.3 3.2 8.1A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.8 1.1Z" />,
  bolt: <path d="m13 2-8 11h6l-1 9 9-12h-6l0-8Z" />,
  book: <><path d="M4 4h7a3 3 0 0 1 3 3v14H7a3 3 0 0 0-3 1V4Zm16 0h-3a3 3 0 0 0-3 3v14h3a3 3 0 0 1 3 1V4Z" /></>,
  sword: <><path d="m19 3 2 2-9 9-3-3 10-8ZM8 12l4 4m-6-2 4 4m-6 2 4-4" /></>,
  bag: <><path d="M5 9h14l1 12H4L5 9Zm4 0V6a3 3 0 0 1 6 0v3" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" /></>,
  star: <path d="m12 2 2.9 6 6.6 1-4.8 4.6 1.2 6.5L12 17l-5.9 3.1 1.2-6.5L2.5 9l6.6-1L12 2Z" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M5 5l14 14M19 5 5 19" />,
};

export function Glyph({ name, size = 20, className = "" }: { name: GlyphName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Portrait({ name, hue = "violet", size = "normal" }: { name: string; hue?: "violet" | "copper" | "teal" | "rose"; size?: "normal" | "large" }) {
  const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("");
  return <span className={`portrait portrait--${hue} portrait--${size}`} aria-label={`Retrato ilustrativo de ${name}`} role="img"><span>{initials}</span></span>;
}

export function ResourceBar({ label, current, max, kind }: { label: string; current: number; max: number; kind: "life" | "power" | "focus" }) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, current / max * 100)) : 0;
  return <div className={`resource resource--${kind}`}>
    <div className="resource__head"><span>{label}</span><strong>{current} <span>/ {max}</span></strong></div>
    <div className="resource__track" role="progressbar" aria-label={label} aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}><span style={{ width: `${percentage}%` }} /></div>
  </div>;
}

export function EffectIcon({ name, symbol, tone = "violet", description }: { name: string; symbol: string; tone?: "violet" | "gold" | "teal"; description: string }) {
  return <button className={`effect-icon effect-icon--${tone}`} type="button" title={`${name}: ${description}`} aria-label={`${name}: ${description}`}><span aria-hidden="true">{symbol}</span></button>;
}

export function EquipmentSlot({ category, item, detail, icon }: { category: string; item: string; detail: string; icon: GlyphName }) {
  return <article className="equipment-slot"><span className="equipment-slot__icon"><Glyph name={icon} size={22} /></span><div><span className="eyebrow">{category}</span><strong>{item}</strong><small>{detail}</small></div></article>;
}

export function ContentCard({ kind, title, description, meta, emblem }: { kind: string; title: string; description: string; meta: string; emblem: string }) {
  return <article className="content-card"><div className="content-card__art" aria-hidden="true"><span>{emblem}</span></div><div className="content-card__body"><span className="eyebrow">{kind}</span><h3>{title}</h3><p>{description}</p><span className="content-card__meta">{meta}</span></div></article>;
}
