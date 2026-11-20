import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { useAppStore } from '@/stores/appStore'
import Home from '@/pages/Home'

const EffectSizes = lazy(() => import('@/pages/modules/EffectSizes'))
const Pairwise = lazy(() => import('@/pages/modules/Pairwise'))
const Heterogeneity = lazy(() => import('@/pages/modules/Heterogeneity'))
const BinaryRare = lazy(() => import('@/pages/modules/BinaryRare'))
const Proportions = lazy(() => import('@/pages/modules/Proportions'))
const MetaRegression = lazy(() => import('@/pages/modules/MetaRegression'))
const SmallStudy = lazy(() => import('@/pages/modules/SmallStudy'))
const DTA = lazy(() => import('@/pages/modules/DTA'))
const NMA = lazy(() => import('@/pages/modules/NMA'))
const Bayesian = lazy(() => import('@/pages/modules/Bayesian'))
const Workflow = lazy(() => import('@/pages/modules/Workflow'))
const Assessment = lazy(() => import('@/pages/Assessment'))
const Glossary = lazy(() => import('@/pages/Glossary'))
const References = lazy(() => import('@/pages/References'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const LEGACY: [string, string][] = [
  ['/effect-size-basics', '/learn/effect-sizes'],
  ['/pairwise-meta-analysis', '/learn/pairwise'],
  ['/proportions-lab', '/learn/proportions'],
  ['/meta-regression', '/learn/meta-regression'],
  ['/dta-meta-analysis', '/learn/dta'],
  ['/network-meta-analysis', '/learn/nma'],
  ['/funnel-plot-lab', '/learn/small-study'],
]

function useThemeEffect() {
  const theme = useAppStore((s) => s.theme)
  const fontSize = useAppStore((s) => s.fontSize)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1220' : '#f8fafc')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    document.documentElement.dataset.font = fontSize
  }, [fontSize])
}

function Loading() {
  return (
    <div className="mx-auto max-w-[1180px] animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  )
}

export default function App() {
  useThemeEffect()
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn/effect-sizes" element={<EffectSizes />} />
            <Route path="/learn/pairwise" element={<Pairwise />} />
            <Route path="/learn/heterogeneity" element={<Heterogeneity />} />
            <Route path="/learn/binary-rare" element={<BinaryRare />} />
            <Route path="/learn/proportions" element={<Proportions />} />
            <Route path="/learn/meta-regression" element={<MetaRegression />} />
            <Route path="/learn/small-study" element={<SmallStudy />} />
            <Route path="/learn/dta" element={<DTA />} />
            <Route path="/learn/nma" element={<NMA />} />
            <Route path="/learn/bayesian" element={<Bayesian />} />
            <Route path="/learn/workflow" element={<Workflow />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/references" element={<References />} />
            <Route path="/settings" element={<Settings />} />
            {LEGACY.map(([from, to]) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}
