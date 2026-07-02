// Tiny helpers for lexicon templates. Kept dependency-free so theme files can
// stay plain data.

/** Replace `{key}` placeholders in a lexicon template. Unknown keys are left visible. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  )
}
