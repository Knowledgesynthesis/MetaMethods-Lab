# MetaMethods Lab

**Meta-analysis, learned by doing.** An interactive course of 11 modules and 26 labs, from effect sizes to network and Bayesian meta-analysis. Every number is produced by a statistical engine that is tested against R.

**Live:** https://meta-methods-lab.vercel.app

## Modules

| # | Module | Labs |
|---|---|---|
| 1 | Effect sizes | 2×2 calculator · OR vs RR divergence · continuous calculator (MD, Hedges' g, ROM) · data-extraction toolkit (median/IQR → mean/SD, SD from CI/SE, combining arms, log HR from CI) |
| 2 | Pairwise meta-analysis | Forest-plot playground (edit studies live) · your-data sandbox with leave-one-out and R export |
| 3 | Heterogeneity | "I² is not absolute" · τ² estimator comparison · CI coverage simulation (Wald vs HKSJ) |
| 4 | Binary outcomes & rare events | MH / Peto / IV with corrections on sparse data · bias simulation |
| 5 | Proportions & prevalence | Transformations vs GLMM · the Freeman–Tukey back-transformation trap |
| 6 | Subgroups & meta-regression | Bubble-plot regression (REML, Knapp–Hartung, R²) · subgroup test · false-positive simulator |
| 7 | Small-study effects & missing evidence | Publication-bias simulator · contour-enhanced funnel, Egger/Peters/Begg, trim-and-fill, PET-PEESE · ROB-ME |
| 8 | Diagnostic test accuracy | Bivariate model with confidence/prediction regions and SROC · threshold simulator · post-test probability |
| 9 | Network meta-analysis | Bucher calculator · network explorer (league table, P-scores, node-splitting, Q decomposition, inconsistency injector) |
| 10 | Bayesian meta-analysis | Prior sensitivity with posterior probabilities of benefit |
| 11 | From protocol to conclusion | Method chooser · error spotter · GRADE and PRISMA 2020 |

Each module follows the same loop: **predict** (commit to an answer before the data change), **experiment** (live lab), **explain** (formula, current guidance, primary source), **retrieve** (inline quick checks and a module quiz). The assessment hub has 55 questions with explanations for every answer, a mixed exam and a review of missed questions.

## Methods follow current guidance

- Cochrane Handbook v6.5.1 (chapter 10 updated November 2026): REML τ² by default; HKSJ confidence interval when τ̂² > 0 and k > 2, otherwise Wald; prediction interval μ̂ ± c·√(τ̂² + SE²) with the same multiplier as the CI; I² from τ²; Q-profile CI for τ².
- Rare events: Mantel–Haenszel without corrections, Peto under its conditions, double-zero studies excluded from OR/RR.
- Proportions: binomial–normal GLMM as primary analysis; Freeman–Tukey back-transformation shown with its failure mode.
- Missing evidence: ROB-ME (Handbook chapter 13, 2024); Peters/Harbord rather than Egger for odds ratios; tests only with ≥ 10 studies.
- DTA: bivariate/HSROC models (Cochrane DTA Handbook v2). NMA: node-splitting, design-by-treatment Q, P-scores with GRADE's minimally contextualised framework.

All 92 references are listed in-app under **References**; each of the 87 DOIs was checked against Crossref.

## Validation

The engine (`src/lib/stats`) is plain TypeScript with no statistical dependencies. Three test suites run with `npm test`:

| Suite | What it checks |
|---|---|
| `engine.test.ts` (155 tests) | Numerical parity with **metafor 5.2**, **meta 9.0**, **netmeta 3.7**, **mada 0.5.12** and **bayesmeta 3.5** on 40+ simulated datasets and the BCG trials: τ² (DL, REML, PM, ML), CIs (Wald, HKSJ), prediction intervals, Q-profile CIs, escalc measures, MH/Peto, GLMM, meta-regression, subgroup tests, Egger/Peters/Begg, trim-and-fill, bivariate DTA, NMA (estimates, SEs, P-scores, node-splitting), Bayesian posteriors, distribution functions |
| `units.test.ts` | Data-extraction conversions (against R `meta`), edge cases, Cochrane CI rule |
| `claims.test.ts` | Every quantitative statement made in the lesson text about the course datasets |

Fixtures are regenerated from R with `npm run validate:r` (requires R with metafor, meta, netmeta, mada, bayesmeta, jsonlite). R code exported by the labs has been executed in R and reproduces the app's results.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 187 tests
npm run lint       # ESLint, zero warnings
npm run build      # type-check + production build (PWA)
```

Requires Node 20+. Stack: React 19, TypeScript, Vite 7, Tailwind CSS 3, Zustand, KaTeX; charts are hand-written SVG (colour-blind-safe Okabe–Ito palette). The app is installable and works offline; progress is stored in the browser only.

```
src/
├── lib/stats/        statistical engine + tests and R fixtures
├── pages/modules/    the 11 lessons
├── components/       lesson blocks, labs, SVG plots, controls
├── content/          curriculum, questions, glossary, references
└── data/datasets.ts  synthetic teaching datasets (scripts/gen-datasets.mjs, seeded)
scripts/r/make-fixtures.R   reference results from R
```

Deployment: Vercel (`vercel.json` rewrites client-side routes to `index.html`).

All teaching datasets are synthetic; their generating parameters are documented in `src/data/datasets.ts`.

## License

MIT
