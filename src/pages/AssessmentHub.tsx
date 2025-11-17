import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { assessmentQuestions } from '@/data/questions'
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react'

export default function AssessmentHub() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [showRationale, setShowRationale] = useState<Record<number, boolean>>({})

  const question = assessmentQuestions[currentQuestion]
  const totalQuestions = assessmentQuestions.length
  const answeredCount = Object.keys(selectedAnswers).length

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion]: answerIndex,
    }))
    setShowRationale((prev) => ({
      ...prev,
      [currentQuestion]: true,
    }))
  }

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const handleSubmit = () => {
    setShowResults(true)
  }

  const handleReset = () => {
    setCurrentQuestion(0)
    setSelectedAnswers({})
    setShowResults(false)
    setShowRationale({})
  }

  const calculateScore = () => {
    let correct = 0
    assessmentQuestions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++
      }
    })
    return {
      correct,
      total: totalQuestions,
      percentage: (correct / totalQuestions) * 100,
    }
  }

  const score = showResults ? calculateScore() : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessment Hub</h1>
        <p className="text-muted-foreground mt-2">
          Test your knowledge of meta-analytic methods
        </p>
      </div>

      {showResults ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Your Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-6xl font-bold text-primary">
                  {score!.percentage.toFixed(0)}%
                </div>
                <p className="text-lg">
                  {score!.correct} out of {score!.total} questions correct
                </p>
                <div className="pt-4">
                  {score!.percentage >= 80 ? (
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      Excellent! You have strong understanding of meta-analytic methods.
                    </p>
                  ) : score!.percentage >= 60 ? (
                    <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                      Good work! Review the areas where you missed questions.
                    </p>
                  ) : (
                    <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      Keep studying! Review the learning modules and try again.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <Button onClick={handleReset} size="lg">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake Assessment
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review Your Answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessmentQuestions.map((q, index) => {
                const isCorrect = selectedAnswers[index] === q.correctAnswer
                const selected = selectedAnswers[index]

                return (
                  <div key={q.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 space-y-2">
                        <p className="font-semibold">
                          {index + 1}. {q.question}
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Your answer:</span>{' '}
                          <span className={isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {q.options[selected]}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Correct answer:</span>{' '}
                            <span className="text-green-600 dark:text-green-400">
                              {q.options[q.correctAnswer]}
                            </span>
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                          {q.rationale}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Question {currentQuestion + 1} of {totalQuestions}
                  </CardTitle>
                  <CardDescription>
                    Module: {question.module} • Difficulty: {question.difficulty}
                  </CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  Progress: {answeredCount}/{totalQuestions} answered
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-lg font-medium">{question.question}</p>

                <div className="space-y-2">
                  {question.options.map((option, index) => {
                    const isSelected = selectedAnswers[currentQuestion] === index
                    const showResult = showRationale[currentQuestion]
                    const isCorrect = index === question.correctAnswer

                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectAnswer(index)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? showResult
                              ? isCorrect
                                ? 'border-green-500 bg-green-500/10'
                                : 'border-red-500 bg-red-500/10'
                              : 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        } ${showResult && isCorrect && !isSelected ? 'border-green-500/50 bg-green-500/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0 ${
                              isSelected
                                ? showResult
                                  ? isCorrect
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-red-500 bg-red-500'
                                  : 'border-primary bg-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className={isSelected && showResult && !isCorrect ? 'line-through' : ''}>
                            {option}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {showRationale[currentQuestion] && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Explanation:</p>
                    <p className="text-sm text-muted-foreground">{question.rationale}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>

                <div className="flex gap-2">
                  {currentQuestion === totalQuestions - 1 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={answeredCount < totalQuestions}
                      size="lg"
                    >
                      Submit Assessment
                    </Button>
                  ) : (
                    <Button onClick={handleNext}>Next</Button>
                  )}
                </div>
              </div>

              {answeredCount < totalQuestions && currentQuestion === totalQuestions - 1 && (
                <p className="text-sm text-center text-muted-foreground">
                  Please answer all questions before submitting
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {assessmentQuestions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      index === currentQuestion
                        ? 'border-primary bg-primary text-primary-foreground'
                        : selectedAnswers[index] !== undefined
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
