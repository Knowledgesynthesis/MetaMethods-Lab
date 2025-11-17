# **MetaMethods Lab — OPTIMIZED MASTER PROMPT FOR EDUCATIONAL APP GENERATION**  
A statistically rigorous, evidence-based master prompt for generating a **mobile-first, offline-capable, dark-mode educational app** that teaches clinicians, methodologists, and evidence synthesizers *all major meta-analytic methods* — from simple pairwise meta-analysis → proportions meta-analysis → diagnostic test accuracy meta-analysis → meta-regression → network meta-analysis and beyond.

---

# **MASTER PROMPT — MetaMethods Lab Educational App Generator (SPECIALIZED VERSION)**

## **Role & Mission**
You are a cross-functional team (PM + Staff Engineer + Senior Instructional Designer + Biostatistics/Meta-Analysis SME + Evidence Synthesis SME + UX Writer + QA).  
Your mission is to design an **advanced meta-analysis methods learning platform** that teaches:

**MetaMethods Lab: Advanced Meta-Analytic Methods for Evidence Synthesizers**  
—A deep, interactive environment where users can explore, visualize, and conceptually “run” a wide range of meta-analytic models on *synthetic* data from study-level summaries (e.g., from systematic reviews).

This app must:
- Support **all learner levels:** senior residents → fellows → clinician-scientists → statisticians in training → evidence synthesis methodologists  
- Cover **core and advanced methods**, including:  
  - Pairwise meta-analysis (continuous, binary, time-to-event outcomes)  
  - Proportion / single-arm meta-analysis (with and without transformations)  
  - Freeman–Tukey double arcsine, logit, and other transformations  
  - Fixed-effect vs random-effects models (DerSimonian–Laird, REML, etc. conceptually)  
  - Heterogeneity metrics (Q, τ², I²) and their interpretation  
  - Meta-regression  
  - Subgroup analysis  
  - Diagnostic test accuracy meta-analysis (bivariate & HSROC concepts)  
  - Network meta-analysis (NMA) — frequentist and Bayesian conceptual overviews  
  - Inconsistency and transitivity assessments in NMA  
  - Small-study effects, publication bias, sensitivity analyses  
- Use **synthetic study-level data only**, no real identifiable data  
- Provide **interactive visual modules** wherever feasible (forest plots, SROC curves, network graphs, transformation comparison, etc.)  
- Be **mobile-first, offline-ready, dark-mode optimized**  
- Adhere to **canonical statistical definitions and best practices** (no made-up formulas)

Your output must be **methodologically correct, internally consistent, and pedagogically clear**.

---

## **Inputs (Fill These)**
- **Primary Topic(s):**  
  Always centered on **meta-analytic methods**, including:  
  - Study-level effect sizes: MD, SMD, RR, OR, HR, RD  
  - Proportions and rates (single-arm, pooled prevalence/incidence)  
  - Transformations: log, logit, Freeman–Tukey double arcsine, etc.  
  - Fixed vs random-effects models  
  - Heterogeneity & small-study effects  
  - Meta-regression & subgroup analysis  
  - Network meta-analysis (NMA) for multiple treatments  
  - Bayesian vs frequentist perspectives (conceptual)  
  - Diagnostic test accuracy (DTA) meta-analysis (bivariate model, HSROC)  
  - Dose–response and time–trend extension (conceptual)  
- **Target Learner Levels:** {{LEVELS}}  
- **Learner Context:** {{CONTEXT}}  
  - e.g., “Systematic review follow-up, advanced EBM coursework, methods fellowship training”
- **Learning Outcomes (SMART + Bloom):** {{LEARNING_OBJECTIVES}}  
  - e.g., “Choose appropriate meta-analytic method; interpret transformations; understand NMA networks; interpret DTA SROC curves”
- **Constraints/Preferences:**  
  Always include:  
  - *Mobile-first; dark mode; offline-ready; synthetic data only; no patient-level data; methods orthodox and textbook-aligned*  
- **References/Standards:** {{REFERENCES}}  
  - e.g., “Cochrane Handbook, GRADE NMA guidance, standard meta-analysis texts”
- **Brand/Voice:** {{VOICE_TONE}}  
  - e.g., “Advanced but approachable, visual, methodologically rigorous”
- **Localization/Regional Norms:** {{LOCALE}}

---

# **Required Deliverables (Produce All)**

---

## **1. Executive Summary**
- Explain why advanced meta-analytic methods are challenging to learn from text alone.  
- Introduce MetaMethods Lab as a **meta-analysis methods simulator + visual explainer**.  
- Provide 2–3 alternative app names + crisp value propositions.

---

## **2. Learner Personas & Use Cases**
Examples:
- Fellow performing a complex meta-analysis (e.g., prevalence + DTA)  
- Clinician-scientist comparing risk ratios vs odds ratios  
- Methodologist teaching NMA concepts  
- Statistician exploring transformations for rare events or proportions  
Use cases: advanced EBM course, methods workshops, supervision of SR/MA projects.

---

## **3. Curriculum Map & Knowledge Graph**
Connect everything from *simple to advanced*:

**Effect Size Basics → Pairwise Meta-analysis → Proportion Meta-analysis → Meta-regression → DTA Meta-analysis → Network Meta-analysis → Specialized/Advanced Extensions**

### **Prerequisites**
- Basic statistics (means, proportions, SDs, CIs)  
- Classical hypothesis testing  
- Introductory meta-analysis concepts (forest plots, pooled effects)  

### **Modules**

1. **Effect Size Fundamentals**  
   - Continuous outcomes: MD, SMD  
   - Binary outcomes: RR, OR, RD  
   - Time-to-event: HR (conceptual)  
   - When to choose which measure  

2. **Pairwise Meta-analysis Core**  
   - Fixed-effect vs random-effects  
   - Inverse-variance weighting  
   - Forest plot interpretation  
   - Q, τ², I² heterogeneity  

3. **Proportions & Single-Arm Meta-analysis**  
   - Pooled proportions  
   - Problems with raw proportions in sparse data  
   - Transforms: logit, Freeman–Tukey double arcsine, etc.  
   - Back-transformation and interpretability  

4. **Advanced Transformations & Rare Events**  
   - Zero cells & continuity corrections  
   - Rare events methods (conceptual)  
   - Comparison: untransformed vs transformed analyses  

5. **Meta-regression & Subgroup Analysis**  
   - Study-level covariates  
   - Interpretation and pitfalls (ecological bias)  
   - Subgroup vs meta-regression  

6. **Diagnostic Test Accuracy Meta-analysis (DTA)**  
   - Sensitivity/specificity estimates  
   - SROC and HSROC concepts  
   - Bivariate random-effects model (conceptual)  
   - Threshold effects  

7. **Network Meta-analysis (NMA)**  
   - Direct vs indirect vs mixed evidence  
   - Network geometry & nodes/edges  
   - Assumptions: transitivity, consistency  
   - Ranking treatments (e.g., SUCRA conceptually)  

8. **Inconsistency & Model Checking in NMA**  
   - Loop inconsistency  
   - Node-splitting concept  
   - Model diagnostics & sensitivity  

9. **Bayesian vs Frequentist Meta-analysis (Conceptual)**  
   - Prior, posterior, credible intervals  
   - Conceptual comparison to frequentist CIs  

10. **Small-Study Effects & Publication Bias**  
   - Funnel plots & asymmetry  
   - Egger-type regression (conceptual)  
   - Trim-and-fill (conceptual critique)  

11. **Advanced Extensions (Overview)**  
   - Dose–response meta-analysis  
   - Time–course analyses  
   - Multivariate meta-analysis (multiple correlated outcomes)  

12. **Integrated Meta-Analysis Sandbox**  
   - Load synthetic datasets → pick method → choose model → visualize outputs → interpret results  

Each module: micro-concepts, Bloom level, prerequisites, cross-links.

---

## **4. Interactives (MetaMethods Lab–Specific)**

### **Examples**

- **Forest Plot Playground**  
  - Adjust individual study effect sizes/weights → see pooled estimate & CI change  
  - Toggle fixed vs random-effects; observe I² changes  

- **Proportion & Transformation Lab**  
  - Enter synthetic event/total counts → compare:  
    - Raw proportion pooling  
    - Logit transform  
    - Freeman–Tukey double arcsine  
  - Show effect on variance and CI width  

- **Rare Events Explorer**  
  - Add zeros → see continuity corrections & how they affect OR/RR  

- **Meta-regression Visualizer**  
  - Slider for study-level covariate → see regression line and residual heterogeneity  

- **DTA SROC Simulator**  
  - Synthetic sensitivities/specificities → build SROC/HSROC-like curves  
  - Visualize how threshold changes point distribution  

- **Network Meta-analysis Graph Builder**  
  - Drag-and-drop treatments & direct comparisons → build network plot  
  - Highlight direct vs indirect evidence paths  

- **NMA Inconsistency Checker (Conceptual)**  
  - Loops of treatments → adjust inconsistencies → display loop discrepancy metrics  

- **Funnel Plot & Small-Study Effects Lab**  
  - Adjust variability → see symmetry/asymmetry patterns  

- **Bayesian vs Frequentist Interval Viewer**  
  - Show conceptual comparison: CI vs credible interval with simple synthetic examples  

For each interactive:
- purpose  
- inputs/controls  
- outputs  
- visualizations (plots, networks, curves)  
- preset example datasets  
- statistical correctness guardrails (no impossible outputs)

---

## **5. Assessment & Mastery**
Include:
- MCQs on method selection (which meta-analytic approach fits?)  
- Interpretation of forest, SROC, and network plots  
- Identification of appropriate transformations for proportions  
- Small-study effect interpretation  
- Conceptual understanding of inconsistency, transitivity  
- Short computation/interpretation exercises with given effect sizes  
Provide **10–20 items** with answer keys and rationales.

---

## **6. Meta-Analytic Reasoning Framework**
Teach a stepwise reasoning pathway:

1. Identify outcome type & effect measure  
2. Determine if single-arm, two-arm, multi-arm, or network context  
3. Decide if meta-analysis is appropriate (heterogeneity/clinical sense)  
4. Choose model (fixed vs random, transform vs not)  
5. Assess heterogeneity & small-study effects  
6. Consider meta-regression/subgroups if pre-specified  
7. For DTA: choose appropriate model type (bivariate/HSROC conceptually)  
8. For NMA: check assumptions and network geometry  
9. Interpret results and limitations clearly  

Pitfalls:
- Misusing OR vs RR  
- Ignoring extreme heterogeneity  
- Overinterpreting NMA rankings  
- Misusing transformations (e.g., misinterpreting arcsine scale)  
- Confusing SROC shape meaning  
- Over-reading funnel plots with few studies  

---

## **7. Accessibility & Safety**
- WCAG 2.2 AA  
- No patient-level real data; synthetic study-level data only  
- Educational-only disclaimers  
- Methods consistent with recognized standards  
- Avoiding any suggestion that app is a validated statistical engine for real analyses  

---

## **8. Tech Architecture (Mobile-First, Offline)**
- React/TypeScript  
- Tailwind + shadcn/ui  
- Recharts/D3 for forest, funnel, SROC, network plots  
- IndexedDB + Service Worker for offline storage of synthetic projects  
- Zustand/Redux for state management  
- Lightweight, JS-based calculation modules (no heavy backend required for conceptual demos)

---

## **9. Data Schemas (JSON)**
Schemas for:
- Study-level effect size inputs (MD, SMD, RR, OR, HR, proportion)  
- Variance/SE, sample sizes  
- Model parameters (fixed/random, τ² estimator)  
- Transformation choices  
- DTA studies (TP, FP, FN, TN)  
- Network structures (nodes, edges)  
- Meta-regression covariates  
- Glossary entries and method descriptors  

Provide representative examples for each.

---

## **10. Screen Specs & Text Wireframes**
Screens:
- Home  
- Effect Size Basics  
- Pairwise Meta-analysis Lab  
- Proportion & Transformation Lab  
- Meta-regression Module  
- DTA Meta-analysis Module  
- Network Meta-analysis Lab  
- Bayesian/Frequentist Concepts Screen  
- Funnel Plot & Bias Lab  
- Advanced Extensions Overview  
- Integrated MetaMethods Sandbox  
- Assessment Hub  
- Glossary  
- Settings  

Provide text-based wireframes: main components, controls, outputs, empty/loading states.

---

## **11. Copy & Content Kit**
Include:
- Microcopy explaining:  
  - “When to use double arcsine vs logit”  
  - “What I² actually tells you (and what it doesn’t)”  
  - “Transitivity in NMA: intuitive analogy”  
- Glossary definitions for all terms  
- Diagram labels and figure captions  
- Two fully fleshed-out example lessons (e.g., one proportions MA, one small NMA) + one integrated advanced case (e.g., network + DTA concepts)

---

## **12. Analytics & A/B Plan**
UI-only experiments:
- Forest plot layout styles  
- Transformation-lab visualization modes  
- Network graph interaction patterns  
No real-world statistical A/B testing of learners.

---

## **13. QA Checklist**
- All formulas and conceptual descriptions checked against standard references  
- No contradictions between modules (e.g., heterogeneity definitions)  
- Transformations correctly described and back-transformed  
- NMA assumptions clearly reflected and not oversold  
- DTA meta-analysis concepts align with standard practice  
- Error-handling for impossible or ill-posed inputs  

---

## **14. Roadmap**
Prototype → Pilot → DTA & NMA Deep-Dive Add-ons → Bayesian Modules Expansion → Personalized Learning Tracks for Different User Types  
Include milestones, risks (e.g., complexity overload), and acceptance criteria.

---

# **Style & Rigor Requirements**
- Advanced but clearly explained, stepwise, and visual  
- Evidence-based and closely aligned with Cochrane & major meta-analysis texts  
- No statistical “shortcuts” or misleading simplifications  
- Pathoma-like clarity but for meta-analytic methods  

---

# **Acceptance Criteria**
- Learners can correctly choose, describe, and interpret appropriate meta-analytic methods for a wide variety of study-level data scenarios.  
- All content is methodologically orthodox and internally consistent.  
- MetaMethods Lab reinforces a unified **Meta-Analysis Methods Systems Map** across pairwise, proportions, DTA, and network meta-analysis.

---

# **Now Generate**
Using the inputs above, produce all deliverables in the required order.  
If any input is missing, make statistically sound assumptions and label them as defaults.
