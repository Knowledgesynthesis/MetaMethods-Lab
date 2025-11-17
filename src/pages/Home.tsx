import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, BarChart3, Network, TestTube, ArrowRight } from 'lucide-react'

const modules = [
  {
    id: 'effect-size-basics',
    title: 'Effect Size Fundamentals',
    description: 'Learn about different effect measures: MD, SMD, RR, OR, HR, and when to use each.',
    icon: BookOpen,
    path: '/effect-size-basics',
    color: 'text-blue-500',
  },
  {
    id: 'pairwise-meta-analysis',
    title: 'Forest Plot Playground',
    description: 'Interactive forest plots with fixed and random-effects models. Explore heterogeneity metrics.',
    icon: BarChart3,
    path: '/pairwise-meta-analysis',
    color: 'text-green-500',
  },
  {
    id: 'proportions-lab',
    title: 'Proportions & Transformations Lab',
    description: 'Compare logit, Freeman-Tukey, and other transformations for single-arm meta-analysis.',
    icon: TestTube,
    path: '/proportions-lab',
    color: 'text-purple-500',
  },
  {
    id: 'meta-regression',
    title: 'Meta-regression Visualizer',
    description: 'Explore how study-level covariates affect pooled estimates and heterogeneity.',
    icon: BarChart3,
    path: '/meta-regression',
    color: 'text-orange-500',
  },
  {
    id: 'dta',
    title: 'DTA Meta-analysis',
    description: 'Diagnostic test accuracy: sensitivity, specificity, and SROC curves.',
    icon: BarChart3,
    path: '/dta-meta-analysis',
    color: 'text-pink-500',
  },
  {
    id: 'network-meta-analysis',
    title: 'Network Meta-analysis',
    description: 'Build treatment networks, explore direct and indirect comparisons.',
    icon: Network,
    path: '/network-meta-analysis',
    color: 'text-indigo-500',
  },
]

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to MetaMethods Lab
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          An interactive platform for learning advanced meta-analytic methods. From basic effect sizes to
          network meta-analysis, master the statistical foundations of evidence synthesis.
        </p>
        <div className="flex flex-wrap gap-4 pt-4">
          <Button asChild size="lg">
            <Link to="/effect-size-basics">
              Start Learning <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/assessment">
              Test Your Knowledge
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid gap-4 pt-8">
        <h2 className="text-2xl font-bold">Interactive Learning Modules</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <Link key={module.id} to={module.path}>
                <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={cn('rounded-lg bg-muted p-2', module.color)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{module.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* About Section */}
      <div className="space-y-4 pt-8">
        <h2 className="text-2xl font-bold">About This Platform</h2>
        <Card>
          <CardHeader>
            <CardTitle>Evidence-Based Learning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              MetaMethods Lab provides a hands-on approach to learning meta-analytic methods. All statistical
              formulas and concepts are aligned with established standards from the Cochrane Handbook and
              leading meta-analysis texts.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Key Features:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Interactive visualizations</li>
                  <li>Synthetic study-level data</li>
                  <li>Real-time calculations</li>
                  <li>Mobile-optimized interface</li>
                  <li>Offline capability</li>
                  <li>Dark mode support</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Who Is This For?</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Residents & Fellows</li>
                  <li>Clinician-Scientists</li>
                  <li>Biostatistics Students</li>
                  <li>Systematic Reviewers</li>
                  <li>Evidence Synthesis Methodologists</li>
                </ul>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> This is an educational tool only. All data is synthetic.
                For real meta-analyses, use validated statistical software like R, Stata, or RevMan.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
