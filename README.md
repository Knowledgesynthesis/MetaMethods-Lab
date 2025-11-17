# MetaMethods Lab

**Advanced Meta-Analytic Methods for Evidence Synthesizers**

An interactive, mobile-first educational platform for learning meta-analytic methods — from basic effect sizes to network meta-analysis.

## Overview

MetaMethods Lab is a comprehensive educational tool designed for clinicians, statisticians, systematic reviewers, and evidence synthesis methodologists. It provides interactive visualizations and hands-on learning experiences for understanding complex meta-analytic concepts.

### Key Features

- 🎯 **Interactive Learning Modules** covering all major meta-analytic methods
- 📊 **Real-time Visualizations** including forest plots, funnel plots, SROC curves, and network graphs
- 📱 **Mobile-First Design** optimized for learning on any device
- 🌙 **Dark Mode** for comfortable viewing
- 💾 **Offline Capability** with service worker and local storage
- ✅ **Assessment Hub** with 15+ questions to test your knowledge
- 📚 **Comprehensive Glossary** of meta-analytic terms

## What You'll Learn

### Core Modules

1. **Effect Size Fundamentals**
   - Continuous outcomes: MD, SMD
   - Binary outcomes: RR, OR, RD
   - Time-to-event: HR (conceptual)

2. **Pairwise Meta-analysis**
   - Fixed-effect vs random-effects models
   - Forest plots and interpretation
   - Heterogeneity metrics (Q, τ², I²)

3. **Proportions & Transformations Lab**
   - Freeman-Tukey double arcsine
   - Logit transformation
   - Arcsine transformation
   - When and why to transform

4. **Meta-regression**
   - Study-level covariates
   - Weighted regression
   - Residual heterogeneity
   - Ecological bias considerations

5. **Diagnostic Test Accuracy (DTA) Meta-analysis**
   - Sensitivity and specificity
   - SROC curves
   - Bivariate and HSROC models (conceptual)

6. **Network Meta-analysis**
   - Direct vs indirect evidence
   - Transitivity and consistency
   - Treatment ranking (SUCRA)
   - Bayesian vs frequentist approaches

7. **Publication Bias & Small-Study Effects**
   - Funnel plots
   - Egger's test and other methods
   - Trim-and-fill (with cautions)

## Technology Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Charts:** Recharts
- **State Management:** Zustand with persistence
- **Offline Support:** Vite PWA plugin with Workbox
- **Data Storage:** IndexedDB via idb

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

### Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   ├── layout/          # Layout components (Layout, Navigation)
│   ├── visualizations/  # Chart components (ForestPlot, etc.)
│   └── interactives/    # Interactive learning components
├── pages/               # Page components for each route
├── lib/                 # Utility functions and calculations
│   ├── utils.ts         # General utilities and statistical functions
│   └── metaAnalysis.ts  # Meta-analysis calculations
├── stores/              # Zustand state management
├── types/               # TypeScript type definitions
├── data/                # Synthetic datasets and questions
├── hooks/               # Custom React hooks
└── assets/              # Static assets
```

## Educational Philosophy

This app follows these principles:

1. **Evidence-Based**: All methods align with Cochrane Handbook and standard meta-analysis texts
2. **Hands-On Learning**: Interactive visualizations let you manipulate parameters and see results
3. **Progressive Complexity**: Start simple, build to advanced concepts
4. **Synthetic Data Only**: All examples use fabricated study-level data
5. **Methodologically Rigorous**: No statistical shortcuts or oversimplifications

## Important Disclaimers

⚠️ **Educational Use Only**

This application is designed for learning meta-analytic concepts. It should NOT be used for:
- Real systematic reviews or meta-analyses
- Clinical decision-making
- Publication-quality analyses

For real meta-analyses, use validated statistical software:
- **R packages**: meta, metafor, netmeta, mada
- **Stata**: meta, metan, network
- **RevMan**: Cochrane's Review Manager
- **Comprehensive Meta-Analysis (CMA)**

⚠️ **Synthetic Data**

All datasets in this app are synthetic and do not represent real clinical trials or patients.

## Key Concepts Covered

### Statistical Methods

- Inverse-variance weighting
- DerSimonian-Laird random-effects
- Variance-stabilizing transformations
- Weighted regression
- Bivariate random-effects models (conceptual)
- Network meta-analysis frameworks

### Interpretation Skills

- Forest plot reading
- Heterogeneity assessment
- Publication bias detection
- Effect measure selection
- Confidence interval interpretation
- Clinical vs statistical significance

### Advanced Topics

- Meta-regression and ecological bias
- Network meta-analysis assumptions
- DTA meta-analysis challenges
- Rare events handling
- Continuity corrections
- Bayesian vs frequentist perspectives

## Assessment

Test your knowledge with 15+ multiple-choice questions covering:
- Effect size selection
- Model choice (fixed vs random)
- Transformation rationale
- Heterogeneity interpretation
- NMA assumptions
- Publication bias assessment

## Accessibility

- WCAG 2.2 AA compliant
- Keyboard navigation support
- Dark mode for reduced eye strain
- Mobile-optimized responsive design
- Screen reader friendly semantic HTML

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Offline Functionality

After the first visit, the app can work offline:
- Service worker caches all assets
- Progress saved in IndexedDB
- Full functionality without network connection

## Contributing

This is an educational project. Contributions welcome for:
- Bug fixes
- Additional example datasets
- New assessment questions
- Improved visualizations
- Accessibility improvements

## References

1. **Cochrane Handbook for Systematic Reviews of Interventions** (Version 6.4)
2. Borenstein M, et al. *Introduction to Meta-Analysis*. Wiley, 2009
3. Deeks JJ, et al. *Analysing data and undertaking meta-analyses*. Cochrane Handbook Chapter 10
4. Dias S, et al. *Network Meta-Analysis for Decision Making*. Wiley, 2018
5. Higgins JPT, Thompson SG. *Quantifying heterogeneity in a meta-analysis*. Stat Med. 2002
6. Freeman MF, Tukey JW. *Transformations related to the angular and the square root*. Ann Math Stat. 1950

## License

MIT License - see LICENSE file for details

## Acknowledgments

Inspired by the need for accessible, interactive meta-analysis education. Built with modern web technologies to make complex statistical concepts more approachable.

---

**Version:** 1.0.0
**Last Updated:** 2024
**Status:** Production-ready educational tool

For questions, issues, or feedback, please open an issue on GitHub.
