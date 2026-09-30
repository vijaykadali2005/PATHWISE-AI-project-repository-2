export type Resource = { id?: string; title: string; url: string }

export type DayPlan = {
  day: number
  topic: string
  learn: string[]
  practice: string
  minutes: number
  resources: Resource[]
}

export type Portal = {
  name: string
  purpose: string
  relevance: string
  url: string
}

export type LinkResource = { title: string; url: string }

export type SkillGapAnalysis = {
  requiredSkills: string[]
  matchingSkills: string[]
  missingSkills: string[]
  recommendedSkillsToLearn: string[]
  readinessPercent: number
}

export type JobDescriptionAnalysis = {
  matchedSkills: string[]
  missingSkills: string[]
  importantKeywords: string[]
  recommendedResumeChanges: string[]
  interviewTopics: string[]
}

export type InterviewQuestion = { question: string; answer: string }

export type InterviewPreparation = {
  targetRole: string
  technicalQuestions: InterviewQuestion[]
  codingQuestions: InterviewQuestion[]
  hrQuestions: InterviewQuestion[]
  projectQuestions: InterviewQuestion[]
}

export type CareerPlan = {
  targetRole: string
  dailyMinutes: number
  level: string
  overview: string
  roleSkills: string[]
  currentSkills: string[]
  skillGaps: string[]
  skillGap: SkillGapAnalysis
  days: DayPlan[]
  finalProject: { title: string; description: string; deliverables: string[] }
  jobPortals: Portal[]
  resumeResources: LinkResource[]
  jobDescriptionAnalysis?: JobDescriptionAnalysis
}

export type ResumeAnalysis = {
  targetRole: string
  atsScore: number
  scoreExplanation: string
  scoreBreakdown: Record<string, number>
  existingSkills: string[]
  skillsToAdd: string[]
  skillsToImprove: string[]
  certificationsToConsider: string[]
  projectsToImprove: string[]
  keywordsToAdd: string[]
  summaryImprovements: string[]
  formattingImprovements: string[]
  strengths: string[]
  jobPortals: Portal[]
  resumeResources: LinkResource[]
  jobDescriptionAnalysis?: JobDescriptionAnalysis
}
