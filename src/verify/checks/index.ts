import type { Check } from '../check.ts'
import { frontmatterInvalid } from './frontmatter-invalid.ts'
import { linkBroken } from './link-broken.ts'
import { pathMissing } from './path-missing.ts'

/**
 * Static check registry. ARCHITECTURE.md § Extensibility: no dynamic plugin
 * loading in v1, so adding a check means adding a file next to this one and an
 * entry here.
 */
export const CHECKS: readonly Check[] = [pathMissing, linkBroken, frontmatterInvalid]
