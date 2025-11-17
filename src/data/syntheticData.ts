import type { ContinuousStudy, BinaryStudy, ProportionStudy, DTAStudy } from '@/types'

// Continuous outcome studies (e.g., blood pressure reduction)
export const continuousStudies: ContinuousStudy[] = [
  {
    id: 'cont-1',
    name: 'Smith 2018',
    year: 2018,
    author: 'Smith',
    treatment: { mean: 128.5, sd: 12.3, n: 150 },
    control: { mean: 135.2, sd: 13.1, n: 145 },
  },
  {
    id: 'cont-2',
    name: 'Jones 2019',
    year: 2019,
    author: 'Jones',
    treatment: { mean: 130.1, sd: 11.8, n: 200 },
    control: { mean: 136.8, sd: 12.5, n: 198 },
  },
  {
    id: 'cont-3',
    name: 'Lee 2020',
    year: 2020,
    author: 'Lee',
    treatment: { mean: 127.3, sd: 14.2, n: 89 },
    control: { mean: 134.5, sd: 13.9, n: 92 },
  },
  {
    id: 'cont-4',
    name: 'Garcia 2021',
    year: 2021,
    author: 'Garcia',
    treatment: { mean: 131.2, sd: 13.5, n: 175 },
    control: { mean: 137.1, sd: 14.0, n: 170 },
  },
  {
    id: 'cont-5',
    name: 'Wang 2022',
    year: 2022,
    author: 'Wang',
    treatment: { mean: 129.4, sd: 12.0, n: 220 },
    control: { mean: 135.9, sd: 12.8, n: 215 },
  },
]

// Binary outcome studies (e.g., mortality or adverse events)
export const binaryStudies: BinaryStudy[] = [
  {
    id: 'bin-1',
    name: 'Anderson 2018',
    year: 2018,
    author: 'Anderson',
    treatment: { events: 45, total: 250 },
    control: { events: 68, total: 245 },
  },
  {
    id: 'bin-2',
    name: 'Brown 2019',
    year: 2019,
    author: 'Brown',
    treatment: { events: 32, total: 180 },
    control: { events: 52, total: 175 },
  },
  {
    id: 'bin-3',
    name: 'Chen 2020',
    year: 2020,
    author: 'Chen',
    treatment: { events: 28, total: 150 },
    control: { events: 41, total: 148 },
  },
  {
    id: 'bin-4',
    name: 'Davis 2021',
    year: 2021,
    author: 'Davis',
    treatment: { events: 55, total: 300 },
    control: { events: 79, total: 295 },
  },
  {
    id: 'bin-5',
    name: 'Evans 2022',
    year: 2022,
    author: 'Evans',
    treatment: { events: 38, total: 200 },
    control: { events: 58, total: 198 },
  },
  {
    id: 'bin-6',
    name: 'Fischer 2022',
    year: 2022,
    author: 'Fischer',
    treatment: { events: 22, total: 125 },
    control: { events: 35, total: 122 },
  },
]

// Proportion studies (single-arm, e.g., prevalence)
export const proportionStudies: ProportionStudy[] = [
  {
    id: 'prop-1',
    name: 'Miller 2018',
    year: 2018,
    author: 'Miller',
    events: 15,
    total: 120,
  },
  {
    id: 'prop-2',
    name: 'Taylor 2019',
    year: 2019,
    author: 'Taylor',
    events: 22,
    total: 185,
  },
  {
    id: 'prop-3',
    name: 'Wilson 2020',
    year: 2020,
    author: 'Wilson',
    events: 8,
    total: 95,
  },
  {
    id: 'prop-4',
    name: 'Moore 2020',
    year: 2020,
    author: 'Moore',
    events: 31,
    total: 250,
  },
  {
    id: 'prop-5',
    name: 'Martin 2021',
    year: 2021,
    author: 'Martin',
    events: 18,
    total: 150,
  },
  {
    id: 'prop-6',
    name: 'Thompson 2022',
    year: 2022,
    author: 'Thompson',
    events: 12,
    total: 110,
  },
  {
    id: 'prop-7',
    name: 'White 2022',
    year: 2022,
    author: 'White',
    events: 25,
    total: 200,
  },
]

// Diagnostic test accuracy studies
export const dtaStudies: DTAStudy[] = [
  {
    id: 'dta-1',
    name: 'Harris 2019',
    year: 2019,
    author: 'Harris',
    tp: 85,
    fp: 12,
    fn: 8,
    tn: 95,
  },
  {
    id: 'dta-2',
    name: 'Clark 2020',
    year: 2020,
    author: 'Clark',
    tp: 72,
    fp: 18,
    fn: 11,
    tn: 89,
  },
  {
    id: 'dta-3',
    name: 'Lewis 2020',
    year: 2020,
    author: 'Lewis',
    tp: 95,
    fp: 8,
    fn: 5,
    tn: 112,
  },
  {
    id: 'dta-4',
    name: 'Walker 2021',
    year: 2021,
    author: 'Walker',
    tp: 68,
    fp: 22,
    fn: 15,
    tn: 95,
  },
  {
    id: 'dta-5',
    name: 'Hall 2021',
    year: 2021,
    author: 'Hall',
    tp: 80,
    fp: 14,
    fn: 9,
    tn: 97,
  },
  {
    id: 'dta-6',
    name: 'Allen 2022',
    year: 2022,
    author: 'Allen',
    tp: 91,
    fp: 10,
    fn: 7,
    tn: 102,
  },
]

// Rare events binary studies (for demonstrating continuity corrections)
export const rareEventStudies: BinaryStudy[] = [
  {
    id: 'rare-1',
    name: 'Study A',
    treatment: { events: 2, total: 200 },
    control: { events: 5, total: 195 },
  },
  {
    id: 'rare-2',
    name: 'Study B',
    treatment: { events: 1, total: 150 },
    control: { events: 3, total: 148 },
  },
  {
    id: 'rare-3',
    name: 'Study C',
    treatment: { events: 0, total: 180 },
    control: { events: 4, total: 175 },
  },
  {
    id: 'rare-4',
    name: 'Study D',
    treatment: { events: 3, total: 220 },
    control: { events: 7, total: 215 },
  },
]

// Studies with covariate for meta-regression (baseline risk as example)
export const studiesWithCovariate = binaryStudies.map((study, index) => ({
  ...study,
  baselineRisk: [0.15, 0.22, 0.18, 0.25, 0.28, 0.20][index], // Control group risk
  yearFromStart: index, // Years from first study
}))
