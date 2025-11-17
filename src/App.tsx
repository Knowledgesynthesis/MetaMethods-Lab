import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import Layout from '@/components/layout/Layout'

// Pages
import Home from '@/pages/Home'
import EffectSizeBasics from '@/pages/EffectSizeBasics'
import PairwiseMetaAnalysis from '@/pages/PairwiseMetaAnalysis'
import ProportionsLab from '@/pages/ProportionsLab'
import MetaRegression from '@/pages/MetaRegression'
import DTAMetaAnalysis from '@/pages/DTAMetaAnalysis'
import NetworkMetaAnalysis from '@/pages/NetworkMetaAnalysis'
import FunnelPlotLab from '@/pages/FunnelPlotLab'
import AssessmentHub from '@/pages/AssessmentHub'
import Glossary from '@/pages/Glossary'
import Settings from '@/pages/Settings'

function App() {
  const { settings } = useAppStore()

  useEffect(() => {
    // Apply dark mode on mount
    if (settings.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.darkMode])

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/effect-size-basics" element={<EffectSizeBasics />} />
          <Route path="/pairwise-meta-analysis" element={<PairwiseMetaAnalysis />} />
          <Route path="/proportions-lab" element={<ProportionsLab />} />
          <Route path="/meta-regression" element={<MetaRegression />} />
          <Route path="/dta-meta-analysis" element={<DTAMetaAnalysis />} />
          <Route path="/network-meta-analysis" element={<NetworkMetaAnalysis />} />
          <Route path="/funnel-plot-lab" element={<FunnelPlotLab />} />
          <Route path="/assessment" element={<AssessmentHub />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
