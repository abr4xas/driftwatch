/**
 * The corpus repo list: pure data, no side effects.
 *
 * It lives apart from `corpus.ts` so it can be imported without running a
 * corpus pass. `test/corpus-bookkeeping.test.ts` needs the list and must not
 * clone anything (see ADR-0007).
 */

export type CorpusRepo = {
  repo: string
  /**
   * Validation set. These repos were added **after** tuning the heuristics, and
   * were not looked at to derive any rule. Their false positive rate is the
   * only honest out-of-sample precision estimate: the calibration group's
   * number is contaminated by having been the material the rules were written
   * against.
   *
   * ADR-0006 condition 9: if the findings or the discards of a repo in this
   * group are **inspected**, that repo moves to calibration and a new one has
   * to be added here. Classifying its findings is the measurement and does not
   * contaminate; opening the repo to see what the tool discarded does.
   */
  holdout?: boolean
  /**
   * Pinned commit. Without pinning, the snapshot would change every time the
   * upstream repo moves, and the diff would stop meaning "driftwatch changed".
   */
  sha: string
}

/**
 * Public repos with real `AGENTS.md` or `CLAUDE.md` files, verified by hand.
 *
 * There are 66: 34 calibration and 32 validation, and no replacement is
 * outstanding, which is what ADR-0006 condition 8 requires.
 *
 * Cloning them all costs ~2.7 GB, so the list is kept deliberately short and
 * new additions are chosen small. `oven-sh/bun` and `supabase/supabase` have
 * good context files but add ~1.5 GB between them, and are not needed. If they
 * are added, warn about the size before starting the download.
 *
 * With `--only <pattern>` a subset runs without re-cloning the rest.
 */
export const CORPUS: readonly CorpusRepo[] = [
  { repo: 'openai/codex', sha: '73a1148c9c775c2a4616ce5096291740a00ed68a' },
  { repo: 'sst/opencode', sha: '830d5eb5354874105cc31599635a80c1662609e8' },
  { repo: 'cloudflare/workers-sdk', sha: 'a549e58af707e84d6aeddaadc6566103ae236dbb' },
  { repo: 'vercel/next.js', sha: '59b76e42ba93e5323484283ee5d1b81176c83d2d' },
  { repo: 'withastro/astro', sha: 'de5cc2d54e92d8746959e39fee1a8f0b4ddfe4bf' },
  { repo: 'browserbase/stagehand', sha: '9f4f878e99ac82cd35480a7dd841dfe3dbb78093' },
  { repo: 'calcom/cal.com', sha: 'b3321936c347744a759e0f36a9793bb78c9bca78' },
  { repo: 'prisma/prisma', sha: 'a51922e3252a2a9d94a00d11b9f9e9008f5ddf74' },
  { repo: 'BerriAI/litellm', sha: '47b15ffb677902fc4550a4471b82e09f77ec77d7' },
  { repo: 'langchain-ai/langchain', sha: 'f092c9a78b3c532ef4c01935c0d4514209ff9f96' },
  { repo: 'remix-run/react-router', sha: 'a05ad5bbda1759d0adfbde13fd17eaca4c86db42' },
  { repo: 'modelcontextprotocol/servers', sha: 'd73f99efbfd40c3aa1b61e88728b3d49fb52608f' },
  { repo: 'block/goose', sha: 'e84de9fe08eb27cd42eca022c2bf59e13baed39e' },

  // These were validation in the first round. Their two findings were reviewed
  // and the uppercase-placeholder rule came out of them, so they became
  // calibration material: they can no longer measure out-of-sample precision.
  { repo: 'microsoft/playwright-mcp', sha: '8a13ef8e9f7385a0f89477922127f31cbfde9761' },
  { repo: 'anthropics/anthropic-sdk-typescript', sha: 'ba14b1f4fdf2e840a7b32297965342a099f6201d' },
  { repo: 'github/spec-kit', sha: '4dd2402ea6d644ee655b78213a1f6d679fc88b0b' },
  { repo: 'unjs/nitro', sha: '3b8980bb824e8552053426243a4755a71a44b377' },
  { repo: 'colinhacks/zod', sha: '36f17960d1defca5d0896d9424f4e1059fbbf081' },

  // These were validation in the second round. The possessive-filler-name rule
  // and the create-instruction rule came out of one of their findings, so they
  // moved to calibration too.
  { repo: 'charmbracelet/crush', sha: 'aee8760458b9b7eaeb58655aee150e3ffef21cd0' },
  { repo: 'tursodatabase/turso', sha: '85e234697d687d4482b693483ac13fb6c93ae99d' },
  { repo: 'sveltejs/svelte', sha: 'ce89035ecbf88ee131838527d29584b968d450fb' },

  // These were validation in the fourth round. Their discards were inspected to
  // understand why the group came out silent, and the prose-window correction
  // came out of that. By ADR-0006 condition 9 that contaminates them:
  // inspecting is contaminating, even when the resulting change favours
  // reporting more rather than reporting less.
  { repo: 'jina-ai/reader', sha: '1574bfd380d249c86c82db4dace0d9c8fe17e2b1' },
  { repo: 'simonw/llm', sha: '1df47ddcac20d58726a993949da8ef84f4081085' },
  { repo: 'cyanheads/git-mcp-server', sha: 'd34d83af201dc0c9012ca501336c3df6171da932' },
  { repo: 'unjs/h3', sha: 'aa50e96a4a3da1732aa54542c498b37e0f8e3508' },

  // This was validation in the fifth round. Its only finding,
  // `test_action_EventNameHere.py`, was a CamelCase placeholder, and the
  // PLACEHOLDER_CAMEL rule came out of it. By condition 9, it moves to
  // calibration.
  //
  // The measurement it produced, 3 true out of 4 findings = 75%, stands as the
  // last valid out-of-sample precision measurement for this group. It is not
  // replaced by the number it would give now: that would be a measurement taken
  // on the very sample that decided the fix.
  { repo: 'browser-use/browser-use', sha: '2b1f9d377999a59fe7627c1a5aa88c12aa42e11f' },

  // --- Validation: never inspected ---
  // Eight repos, which is what ADR-0006 condition 8 requires. They are chosen
  // small on purpose, because the full corpus already weighs ~2.7 GB of clones,
  // and they are cloned only when a measurement is needed:
  // `pnpm corpus --only <pattern>`.
  { repo: 'vitest-dev/vitest', sha: 'c119be016295b45a005e2a36367ea7d133b4f385', holdout: true },
  {
    repo: 'rust-lang/rust-analyzer',
    sha: 'f3120321073d8046795c6824976be8b0ae92c999',
    holdout: true,
  },
  { repo: 'nuxt/nuxt', sha: '03e9df01a1256d214ac5c5c14514f95803ecb244', holdout: true },
  { repo: 'openai/openai-node', sha: 'b4168065d3839b3008d557fdbb8972da2e247f24', holdout: true },
  {
    repo: 'modelcontextprotocol/typescript-sdk',
    sha: '5119ee7fd7790e335a3fb60ef36f85334e2a6326',
    holdout: true,
  },
  {
    repo: 'modelcontextprotocol/python-sdk',
    sha: '9972c21aa42054fb1450c5fc614761ed11847ec6',
    holdout: true,
  },
  { repo: 'openai/openai-python', sha: 'f348ec87b934c98889102668913e0a3ae7fc303d', holdout: true },
  { repo: 'railwayapp/cli', sha: 'dee356855b6a88ed52cb3fac42956da7a9200474', holdout: true },
  /**
   * Swift/macOS, a domain the rest of the corpus does not have, and seven
   * sources of which five are skills. Added to the validation group on
   * purpose: ADR-0006's condition 6 passed with three findings from one root
   * cause, and what it needs is more out-of-sample mass. The group was chosen
   * before looking at a single finding.
   */

  /**
   * Moved out of the validation group on 2026-09-10: rules were derived from
   * its findings (ADR-0006 condition 9), so its numbers are no longer
   * out of sample. A replacement is owed.
   */
  { repo: 'spatie/bloom', sha: 'ec6fc210a049a77c68e3e76e9713edd46854f9b3' },
  // PHP/Laravel, another domain the corpus lacked. One `CLAUDE.md` of 6 KB,
  // which is smaller than every repo that has produced a finding so far.
  { repo: 'spatie/laravel-flare', sha: '730ebb52437e425f1d55d09008e99e3b056efe37', holdout: true },
  /**
   * Its `CLAUDE.md` is ten bytes: `@AGENTS.md`, Claude Code's import syntax.
   * driftwatch does not follow imports, so it audits a source with no claims
   * in it. A real pattern worth having on the record.
   */

  /**
   * Moved out of the validation group on 2026-09-10: rules were derived from
   * its findings (ADR-0006 condition 9), so its numbers are no longer
   * out of sample. A replacement is owed.
   */
  { repo: 'laravel/vet', sha: '9f3379ab593268020c4205e40d94b9066fa088c9' },
  // Ruby, and the most canonical repo in it. The largest of the corpus, but a
  // shallow clone is a fraction of the 289 MB the API reports.
  { repo: 'rails/rails', sha: '52fa23ce8e1d39ff281bf300867e9ba7c7d66111', holdout: true },
  // Three sources -- a `CLAUDE.md` and two skills -- for 23 KB of context in a
  // 9 MB repo, which is the profile that actually adds finding mass.
  { repo: 'alpinejs/alpine', sha: '8554b9e2285ca598b672f636a578f837136e522b', holdout: true },
  // 24 KB of `AGENTS.md` in a 267 KB repo, the best context-to-clone ratio in
  // the corpus. Its `CLAUDE.md` is another ten-byte `@AGENTS.md` import.

  /**
   * Moved out of the validation group on 2026-09-10: rules were derived from
   * its findings (ADR-0006 condition 9), so its numbers are no longer
   * out of sample. A replacement is owed.
   */
  {
    repo: 'vercel-labs/marketing-team-eve-template',
    sha: 'f4a9309de0c03b4a42699687f6ae87dd86a913d2',
  },
  { repo: 'hieunc229/mailflare', sha: 'c5cfa1be6da1c8a2e4d293ba1c4520796bc3b6a7', holdout: true },
  // Spanish-language context file, which nothing else in the corpus has: it is
  // what the Spanish entries in `context-prose.ts` were written for.
  { repo: 'ecrespo/vigia-eew', sha: 'fa90f3c39b667c42c4ebeb4d079c7a02b35363de', holdout: true },
  /**
   * `AGENTS.md`, `CLAUDE.md` and `.github/copilot-instructions.md`, all three
   * 4112 bytes. The first two collapse into one source with an alias; the
   * third does not, because `collapseDuplicates` keys on the directory too.
   * The corpus had no case of that.
   */
  { repo: 'harehare/mq', sha: 'e9d12c0844ba0161853540192d892e14500e4e95', holdout: true },
  { repo: 'thatseoagent/mcp', sha: '5145a8d53a328b68086bd43f88a2f3b5e3d9677b', holdout: true },

  /**
   * The three replacements owed after rounds four and five, plus two more.
   * Chosen for the profile that actually produces findings — large context
   * files, several sources per repo — and, as always, the group was decided
   * before a single finding was looked at.
   */
  /**
   * 28.6 KB of root `AGENTS.md`, the largest in the corpus, plus nested ones
   * per package and per template.
   *
   * Moved out of the validation group on 2026-09-10: the symlink collapse in
   * `discover.ts` was derived from its findings. Like
   * `course-video-manager`, it leaves clean. One more replacement owed.
   */
  { repo: 'emdash-cms/emdash', sha: '44114afd391ea0738bf95b4688d59513d2cb6347' },
  /**
   * Ten skills under `.claude/skills/` plus a 5 KB `CLAUDE.md`.
   *
   * Moved out of the validation group on 2026-09-10: the `~/` discard and the
   * external-root section rule were both derived from its findings. Unlike
   * the three moved in round five, it leaves **clean** — the rules fixed it
   * rather than the move hiding it. One replacement is owed.
   */
  {
    repo: 'mattpocock/course-video-manager',
    sha: 'a20151178efe153b5cc3313f972947a05c4042b6',
  },
  {
    repo: 'Universal-Commerce-Protocol/ucp',
    sha: 'ee07e9f0219b4ef1a9332ba6082f446b967788f7',
    holdout: true,
  },
  { repo: 'awcodes/mason', sha: '258ce9fd2a03e771bea846db3654b75f6d137e23', holdout: true },
  { repo: 'mattpocock/sandcastle', sha: 'e99f832f26dc9d245c019a9ddd19fa5dee792427', holdout: true },

  /**
   * The thirteen added 2026-09-10, twelfth round, all **validation**.
   *
   * M2 set itself the obligation of re-measuring ADR-0006 condition 6 once the
   * validation group carried ~10 findings. Four new checks did not get it
   * there: the group still holds 3, because every finding the new checks
   * produced landed in a calibration repo. Finding mass has to come from
   * repositories, not from checks, so these are repositories.
   *
   * They also settle the two replacements owed for `course-video-manager` and
   * `emdash`.
   *
   * **Selected on metadata only**, before any of their content was read:
   * public, not archived, not a fork, under ~65 MB of history, and holding
   * more than 1.5 KB of agent context files. Nothing was inspected to guess
   * whether a repo would produce a finding — selecting on the outcome is the
   * one thing a validation group cannot survive.
   *
   * The language spread is deliberate. The corpus was TypeScript-heavy, and
   * `path/missing` sees a different document in a Go, Rust, R, Swift, Kotlin,
   * Zig, Java or C repository: different path shapes, different build
   * commands, different conventions for naming a file in prose.
   *
   * `HorusGoul/eslint-plugin-react-render-types` was the largest candidate by
   * context bytes (72 files, 221 KB) and was **not** taken: at that ratio to
   * its 444 KB of history it is a skill collection rather than a repo with
   * skills, and dozens of findings from one templated root cause would move
   * the percentage without adding evidence.
   */
  { repo: '1amageek/SwiftAgent', sha: 'cdeb70357a8d8e50bfe98fdf2de61636962583a1', holdout: true },
  { repo: 'Endle/fireSeqSearch', sha: 'ef8888bb9d0d8371621f75ae033e3e09692fd0c9', holdout: true },
  {
    repo: 'manusa/podman-mcp-server',
    sha: '5fd49dbb496f74216c8c464d7c0cf84c9a9bd848',
    holdout: true,
  },
  /**
   * Moved out of the validation group on 2026-09-10, fifteenth round: both the
   * specifier rule (`link:../..`) and the version-template rule
   * (`UPGRADE_GUIDE_X.Y.Z.md`) were derived from its four findings. It leaves
   * **clean** — the rules fixed it rather than the move hiding it. One
   * replacement owed.
   */
  { repo: 'aptos-labs/aptos-ts-sdk', sha: 'da6319287572e8f62f38c73be0e2346ca7447e21' },
  { repo: 'hughjonesd/huxtable', sha: '6dcac79c2c6132efdfde8de21408cd2f840cd11e', holdout: true },
  { repo: 'securego/gosec', sha: '8075fd2e520d33330afe168f26fc7a91f57f2cbc', holdout: true },
  {
    repo: 'CrossPaste/crosspaste-desktop',
    sha: 'b5c4b8b20476184b751f59ba9d1de851c8c57038',
    holdout: true,
  },
  {
    repo: 'northword/zotero-format-metadata',
    sha: '2b747409e8c3df866fca327a8ad859d770694a5b',
    holdout: true,
  },
  { repo: 'semos-labs/attyx', sha: '12c06ec7f8ff63a6fee3590a15dc1c9ecbfb68e9', holdout: true },
  { repo: 'pktgen/Pktgen-DPDK', sha: 'c0f11bba974036ee6b69f0e9c734da9325033e99', holdout: true },
  { repo: 'exoscale/cli', sha: '63ca41e1848b12fbdf879938c7900e6aaab2ab62', holdout: true },
  {
    repo: 'digitalpetri/opc-ua-demo-server',
    sha: 'fef2539535ff71dedb30990c30fb668abdfd77b8',
    holdout: true,
  },
  /**
   * Twenty sources, sixteen findings, all false — the noisiest repo the corpus
   * has ever held, and the one that broke ADR-0006 conditions 2 and 5 in the
   * thirteenth round.
   *
   * Moved out of the validation group on 2026-09-10, fourteenth round: the
   * foreign-tool rule in `verify/foreign-tools.ts` was derived from its seven
   * `.agent/` and `.cursor/` findings, two of which were autofixable. It leaves
   * with **nine** findings still false, not clean: the `research/iterN/`
   * placeholder class and one `.tfw/` path are open. One replacement owed, and
   * two were added.
   */
  {
    repo: 'saubakirov/KZ-IT-telegram-list',
    sha: '13a88a07544e3d13617461f2aa1687df6f76125b',
  },

  /**
   * The two added 2026-09-10, fourteenth round, replacing
   * `KZ-IT-telegram-list` in the validation group. Same selection as the
   * thirteen before them: metadata only, nothing read first.
   */
  {
    repo: 'raphaelmansuy/edgecrab',
    sha: 'ed3330703bc91f498062451136b89592c9ee098a',
    holdout: true,
  },
  /**
   * Moved out of the validation group on 2026-09-10, fifteenth round: the
   * version and date template rule was derived from its two findings. Leaves
   * clean. One replacement owed.
   */
  { repo: 'garagon/aguara', sha: 'b98d63554228dce7f6a3b578ffb5e3676115e1d4' },

  /**
   * The two added 2026-09-10, sixteenth round, replacing `aptos-ts-sdk` and
   * `aguara`. Same selection as every addition since the thirteenth: metadata
   * only, nothing read first.
   */
  {
    repo: 'ckotzbauer/vulnerability-operator',
    sha: 'a03ed2801d0467c1832d49de462676afca8ccff4',
    holdout: true,
  },
  { repo: 'fancy1108/Clutch', sha: 'da61f6f85dcf0c3043b998a3ab024b5a4333dab4', holdout: true },
]

/** `owner/repo` as a single filename-safe segment. */
export function slugOf(repo: string): string {
  return repo.replace('/', '__')
}
