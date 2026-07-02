import type { ReactNode } from 'react'
import { Button } from '../components/Button'

/**
 * The teaching callout shown on every tutorial scene: a short label, body copy,
 * and the primary button that advances the scene. Rendered as a region (not a
 * modal over inert content) so focus order stays natural.
 */
export function CoachMark({
  title,
  children,
  cta,
  onCta,
  ctaDisabled = false,
}: {
  title: string
  children: ReactNode
  /** When empty, no button renders — the scene advances via its own action. */
  cta?: string
  onCta?: () => void
  ctaDisabled?: boolean
}) {
  return (
    <section
      role="region"
      aria-label={title}
      className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface/90 p-4 text-left shadow-card"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-label text-accent">
        {title}
      </p>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
      {cta && (
        <Button onClick={onCta} disabled={ctaDisabled} className="w-full">
          {cta}
        </Button>
      )}
    </section>
  )
}
