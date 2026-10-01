import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDownToLine, ArrowUpRight, BookOpen, BrainCircuit, BriefcaseBusiness,
  Check, ChevronDown, CircleHelp, Clock3, FileText, Gauge, GraduationCap,
  LayoutDashboard, Lightbulb, LoaderCircle, Plus, ShieldCheck, Sparkles, Target,
  Upload, X,
} from 'lucide-react'
import type { CareerPlan, DayPlan, InterviewPreparation, JobDescriptionAnalysis, ResumeAnalysis } from './types'
import './theme.css'

type Mode = 'dashboard' | 'career' | 'resume' | 'interview'
type ApiResult<T> = { data?: T; error?: string }
type CareerProfile = { name: string; role: string; skills: string; minutes: string }
type ResumeSummary = { targetRole: string; atsScore: number; existingSkills: string[]; missingSkills: string[] }

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<ApiResult<T>> {
  let response: Response
  try {
    response = await fetch(url, options)
  } catch {
    return { error: 'Can’t reach the Pathwise API. Check your connection and confirm the API is running.' }
  }
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json') || contentType.includes('+json')
  if (!isJson) {
    const status = ` (HTTP ${response.status})`
    return {
      error: response.ok
        ? `The API returned a non-JSON response${status}. Check that the API deployment is configured correctly.`
        : `The API request failed${status} and returned a non-JSON response. Check that the API function is deployed and try again.`,
    }
  }

  let body: { error?: string } & Record<string, unknown>
  try {
    body = await response.json()
  } catch {
    return { error: `The API returned invalid JSON (HTTP ${response.status}). Please try again.` }
  }
  if (!response.ok) return { error: body.error || `The API request failed (HTTP ${response.status}). Please try again.` }
  return { data: body as T }
}

function LinkOut({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={13} aria-hidden="true" /></a>
}

function TagList({ items, empty }: { items: string[]; empty?: string }) {
  return items.length
    ? <div className="tag-list">{items.map((item, index) => <span className="tag" key={`${item}-${index}`}>{item}</span>)}</div>
    : <p className="empty-copy">{empty || 'No items to show.'}</p>
}

function PointList({ items }: { items: string[] }) {
  return items.length
    ? <ul className="point-list">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
    : <p className="empty-copy">No role-specific suggestions in this category.</p>
}

function App() {
  const [mode, setMode] = useState<Mode>('career')
  const [apiReady, setApiReady] = useState<boolean | null>(null)
  const [plan, setPlan] = useState<CareerPlan | null>(() => {
    const stored = readStorage<CareerPlan | null>('pathwise-career-plan', null)
    return stored?.days?.length === 30 && stored.skillGap ? stored : null
  })
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [resumeSummary, setResumeSummary] = useState<ResumeSummary | null>(() => readStorage<ResumeSummary | null>('pathwise-resume-summary', null))
  const [interviewPrep, setInterviewPrep] = useState<InterviewPreparation | null>(() => readStorage<InterviewPreparation | null>('pathwise-interview-prep', null))
  const [careerBusy, setCareerBusy] = useState(false)
  const [resumeBusy, setResumeBusy] = useState(false)
  const [interviewBusy, setInterviewBusy] = useState(false)
  const [careerError, setCareerError] = useState('')
  const [resumeError, setResumeError] = useState('')
  const [interviewError, setInterviewError] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [savedProfile] = useState(() => readStorage<CareerProfile>('pathwise-career-profile', { name: '', role: '', skills: '', minutes: '120' }))
  const [name, setName] = useState(savedProfile.name)
  const [role, setRole] = useState(savedProfile.role)
  const [skills, setSkills] = useState(savedProfile.skills)
  const [minutes, setMinutes] = useState(savedProfile.minutes)
  const [resumeRole, setResumeRole] = useState(savedProfile.role)
  const [completedDays, setCompletedDays] = useState<number[]>(() => readStorage<number[]>('pathwise-completed-days', []).filter((day) => Number.isInteger(day) && day >= 1 && day <= 30))

  useEffect(() => {
    void request<{ aiConfigured: boolean }>('/api/health').then(({ data }) => setApiReady(data?.aiConfigured ?? false))
  }, [])

  function toggleDay(day: number) {
    setCompletedDays((current) => {
      const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
      localStorage.setItem('pathwise-completed-days', JSON.stringify(next))
      return next
    })
  }

  async function submitCareer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCareerBusy(true)
    setCareerError('')
    const result = await request<CareerPlan>('/api/career-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, targetRole: role, skills, dailyMinutes: Number(minutes) }),
    })
    if (result.data) {
      setPlan(result.data)
      localStorage.setItem('pathwise-career-plan', JSON.stringify(result.data))
      const profile = { name, role, skills, minutes }
      localStorage.setItem('pathwise-career-profile', JSON.stringify(profile))
      setCompletedDays([])
      localStorage.removeItem('pathwise-completed-days')
    } else setCareerError(result.error || 'Plan generation failed.')
    setCareerBusy(false)
  }

  async function submitResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!resumeFile) {
      setResumeError('Choose a resume file to continue.')
      return
    }
    setResumeBusy(true)
    setResumeError('')
    const body = new FormData()
    body.set('targetRole', resumeRole || role)
    body.set('resume', resumeFile)
    if (jobDescription.trim()) body.set('jobDescription', jobDescription.trim())
    const result = await request<ResumeAnalysis>('/api/resume-analyze', { method: 'POST', body })
    if (result.data) {
      setAnalysis(result.data)
      setResumeSummary({ targetRole: result.data.targetRole, atsScore: result.data.atsScore, existingSkills: result.data.existingSkills, missingSkills: result.data.skillsToAdd })
      localStorage.setItem('pathwise-resume-summary', JSON.stringify({ targetRole: result.data.targetRole, atsScore: result.data.atsScore, existingSkills: result.data.existingSkills, missingSkills: result.data.skillsToAdd }))
    }
    else setResumeError(result.error || 'Resume analysis failed.')
    setResumeBusy(false)
  }

  async function submitInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const targetRole = role || resumeRole
    const currentSkills = skills.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean)
    if (!targetRole || !currentSkills.length) {
      setInterviewError('Add a target role and skills in Career Guide first.')
      return
    }
    setInterviewBusy(true)
    setInterviewError('')
    const result = await request<InterviewPreparation>('/api/interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole, skills: currentSkills, resumeContext: analysis ? { existingSkills: analysis.existingSkills, projectsToImprove: analysis.projectsToImprove, keywordsToAdd: analysis.keywordsToAdd } : undefined }),
    })
    if (result.data) {
      setInterviewPrep(result.data)
      localStorage.setItem('pathwise-interview-prep', JSON.stringify(result.data))
    } else setInterviewError(result.error || 'Interview preparation failed.')
    setInterviewBusy(false)
  }

  const title = { dashboard: 'Dashboard', career: 'Career guide', resume: 'Resume analyzer', interview: 'Interview prep' }[mode]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#career" onClick={(event) => { event.preventDefault(); setMode('career') }} aria-label="Pathwise home">
          <span className="brand-mark"><Sparkles size={17} /></span><span>pathwise<span className="brand-period">.</span></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button aria-label="Career dashboard" title="Career dashboard" className={mode === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setMode('dashboard')}>
            <LayoutDashboard size={17} /><span>Dashboard</span><span className="nav-arrow">›</span>
          </button>
          <button aria-label="Career guide" title="Career guide" className={mode === 'career' ? 'nav-item active' : 'nav-item'} onClick={() => setMode('career')}>
            <Target size={17} /><span>Career guide</span><span className="nav-arrow">›</span>
          </button>
          <button aria-label="Resume analyzer" title="Resume analyzer" className={mode === 'resume' ? 'nav-item active' : 'nav-item'} onClick={() => setMode('resume')}>
            <FileText size={17} /><span>Resume analyzer</span><span className="nav-arrow">›</span>
          </button>
          <button aria-label="Interview preparation" title="Interview preparation" className={mode === 'interview' ? 'nav-item active' : 'nav-item'} onClick={() => setMode('interview')}>
            <BrainCircuit size={17} /><span>Interview prep</span><span className="nav-arrow">›</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note"><ShieldCheck size={15} /><span>Your resume is processed for analysis and never saved on this server.</span></div>
          <div className="sidebar-footer"><span className={`health-dot ${apiReady ? 'ready' : ''}`} />{apiReady ? 'AI configured' : apiReady === false ? 'AI setup needed' : 'Checking setup'}</div>
          <div className="version-note">CAREER TOOLKIT · 01</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div>
          <div className="topbar-right"><span className="secure-label"><ShieldCheck size={14} />Private by design</span><span className={`connection-pill ${apiReady ? 'connected' : ''}`}><span />{apiReady ? 'Gemini configured' : 'Gemini setup'}</span></div>
        </header>

        {mode === 'dashboard' ? (
          <DashboardView plan={plan} summary={resumeSummary} interviewPrep={interviewPrep} completedDays={completedDays} onNavigate={setMode} />
        ) : mode === 'career' ? (
          <section className="page-wrap" aria-labelledby="career-title">
            <div className="page-heading">
              <div><p className="eyebrow"><span className="eyebrow-line" />YOUR PERSONAL CAREER PLAN</p><h1 id="career-title">Make your next move <em>count.</em></h1><p className="page-intro">A focused learning path, shaped around your goal and the time you have.</p></div>
              <div className="heading-stamp"><span>30</span><small>DAY<br />ROADMAP</small></div>
            </div>

            <div className="career-layout">
              <section className="panel form-panel" aria-label="Career plan details">
                <div className="panel-heading"><div className="section-icon mint"><Target size={17} /></div><div><h2>Set your direction</h2><p>Tell us where you want to go.</p></div><span className="step-count">01 / 02</span></div>
                <form onSubmit={submitCareer} className="career-form">
                  <label className="field-label" htmlFor="name">Your name</label>
                  <input id="name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Vijay" />
                  <label className="field-label" htmlFor="target-role">Target role</label>
                  <input id="target-role" required maxLength={120} value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Java Developer" />
                  <label className="field-label" htmlFor="current-skills">Skills you already have <span>Separate with commas</span></label>
                  <textarea id="current-skills" rows={3} required value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Java, HTML, CSS, JavaScript, SQL" />
                  <label className="field-label" htmlFor="study-time">Learning time each day</label>
                  <div className="input-with-unit"><Clock3 size={16} /><input id="study-time" type="number" min="30" max="600" step="15" required value={minutes} onChange={(event) => setMinutes(event.target.value)} /><span>minutes / day</span></div>
                  <p className="form-note"><Lightbulb size={14} />Small, consistent sessions make a better plan.</p>
                  {careerError && <div className="error-message" role="alert"><CircleHelp size={15} />{careerError}</div>}
                  <button className="primary-button full-button" disabled={careerBusy} type="submit">{careerBusy ? <><LoaderCircle className="spin" size={16} /> Building your plan…</> : <><Sparkles size={16} /> Generate my plan <ArrowDownToLine size={15} /></>}</button>
                </form>
              </section>

              {plan ? (
                <div className="plan-summary panel">
                  <div className="summary-topline"><span className="summary-kicker">YOUR DIRECTION</span><span className="level-badge">{plan.level}</span></div>
                  <h2>{role || plan.targetRole}</h2><p>{plan.overview}</p>
                  <div className="summary-divider" />
                  <div className="summary-stats">
                    <div><span className="stat-number">{completedDays.length}<small> / 30</small></span><span className="stat-label">Days complete</span></div>
                    <div><span className="stat-number">{plan.skillGaps.length.toString().padStart(2, '0')}</span><span className="stat-label">Skill gaps identified</span></div>
                  </div>
                  <div className="progress-track"><span style={{ width: `${Math.min(100, (completedDays.length / 30) * 100)}%` }} /></div>
                  <p className="progress-caption">{completedDays.length === 0 ? 'Your first step is ready.' : `${Math.round(completedDays.length / 30 * 100)}% of your roadmap complete`}</p>
                  <div className="skill-group"><h3>Already in your toolkit</h3><TagList items={plan.currentSkills} /></div>
                  <div className="skill-group"><h3>Skills to build</h3><TagList items={plan.skillGaps} empty="Your current skills cover the main role requirements." /></div>
                  <div className="skill-group"><h3>Core role skills</h3><TagList items={plan.roleSkills} /></div>
                </div>
              ) : (
                <div className="empty-plan panel"><div className="empty-plan-art"><span className="art-circle circle-one" /><span className="art-circle circle-two" /><BookOpen size={31} /></div><span className="empty-kicker">YOUR PLAN STARTS HERE</span><h2>A clearer path is one good plan away.</h2><p>Your skill gap, daily lessons and project roadmap will show up here.</p><div className="empty-meta"><span><Check size={13} /> Built around your skills</span><span><Check size={13} /> Flexible to your schedule</span></div></div>
              )}
            </div>

            {plan && <CareerDashboard plan={plan} completedDays={completedDays} onToggleDay={toggleDay} role={role} />}
          </section>
        ) : mode === 'resume' ? (
          <section className="page-wrap" aria-labelledby="resume-title">
            <div className="page-heading resume-heading">
              <div><p className="eyebrow"><span className="eyebrow-line" />A CLEARER READ ON YOUR RESUME</p><h1 id="resume-title">Put your experience <em>to work.</em></h1><p className="page-intro">Get role-specific feedback on what is already strong and what to sharpen.</p></div>
              <div className="heading-stamp document-stamp"><FileText size={24} /><small>RESUME<br />REVIEW</small></div>
            </div>
            <section className="panel resume-form-panel">
              <div className="panel-heading"><div className="section-icon coral"><FileText size={17} /></div><div><h2>Review your resume</h2><p>Upload a document and choose the role you have in mind.</p></div><span className="step-count">PDF · DOCX · TXT</span></div>
              <form onSubmit={submitResume} className="resume-form">
                <div className="upload-zone">
                  <input id="resume-file" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => { setResumeFile(event.target.files?.[0] || null); setResumeError('') }} />
                  {resumeFile ? <div className="file-picked"><div className="file-icon"><FileText size={19} /></div><div className="file-info"><strong>{resumeFile.name}</strong><span>{(resumeFile.size / 1024).toFixed(0)} KB · Ready to analyze</span></div><button className="icon-button" type="button" onClick={() => setResumeFile(null)} aria-label="Remove resume"><X size={16} /></button></div> : <label htmlFor="resume-file" className="upload-prompt"><span className="upload-icon"><Upload size={20} /></span><strong>Drop your resume here, or <u>browse files</u></strong><span>PDF, DOCX or TXT · Up to 8 MB</span></label>}
                </div>
                <div className="resume-controls"><div className="role-input"><label className="field-label" htmlFor="resume-role">Target role</label><input id="resume-role" required maxLength={120} value={resumeRole} onChange={(event) => setResumeRole(event.target.value)} placeholder="e.g. Product Designer" /></div><button className="primary-button analyze-button" type="submit" disabled={resumeBusy}>{resumeBusy ? <><LoaderCircle className="spin" size={16} /> Analyzing…</> : <><Sparkles size={16} /> Analyze resume</>}</button></div>
                <label className="field-label jd-label" htmlFor="job-description">Job description <span>Optional · Paste the role requirements for a direct comparison</span></label>
                <textarea className="jd-textarea" id="job-description" rows={4} maxLength={12000} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the job description to compare it with your resume…" />
                <p className="privacy-inline"><ShieldCheck size={14} />Your file is held in memory only for analysis; it is not written to disk.</p>
                {resumeError && <div className="error-message" role="alert"><CircleHelp size={15} />{resumeError}</div>}
              </form>
            </section>
            {analysis ? <ResumeDashboard analysis={analysis} role={resumeRole} /> : <div className="resume-explainer"><div className="explainer-step"><span>01</span><h3>Role match</h3><p>Skills, keywords and experience evaluated against your target.</p></div><div className="explainer-step"><span>02</span><h3>Clear priorities</h3><p>Separate, practical improvements for each part of your resume.</p></div><div className="explainer-step"><span>03</span><h3>Next steps</h3><p>A compatibility estimate with a transparent category breakdown.</p></div></div>}
            {analysis?.jobDescriptionAnalysis && <JobDescriptionResults analysis={analysis.jobDescriptionAnalysis} />}
          </section>
        ) : (
          <InterviewView role={role || resumeRole} interviewPrep={interviewPrep} busy={interviewBusy} error={interviewError} onSubmit={submitInterview} onGoToCareer={() => setMode('career')} />
        )}
        <footer className="page-footer"><span>PATHWISE · CAREER TOOLKIT</span><span><ShieldCheck size={13} /> AI guidance, thoughtfully applied</span></footer>
      </main>
    </div>
  )
}

function CareerDashboard({ plan, completedDays, onToggleDay, role }: { plan: CareerPlan; completedDays: number[]; onToggleDay: (day: number) => void; role: string }) {
  return (
    <section className="dashboard-section" aria-label="Your 30-day learning plan">
      <div className="section-title-row"><div><p className="eyebrow"><span className="eyebrow-line" />THE ROADMAP</p><h2>30 days, one step at a time.</h2></div><span className="plan-meta"><Clock3 size={14} /> {plan.days[0]?.minutes || 60} min / day</span></div>
      <div className="roadmap-header"><div><span className="roadmap-caption">YOUR DAILY PLAN</span><span className="roadmap-subtitle">A progression from fundamentals to a portfolio-ready result.</span></div><span className="days-count">{completedDays.length.toString().padStart(2, '0')} / 30 COMPLETE</span></div>
      <div className="day-grid">{plan.days.map((day) => <DayCard key={day.day} day={day} done={completedDays.includes(day.day)} onToggle={() => onToggleDay(day.day)} />)}</div>
      <div className="final-project panel"><div className="project-icon"><GraduationCap size={20} /></div><div className="project-copy"><span className="roadmap-caption">DAY 30 · CAPSTONE</span><h3>{plan.finalProject.title}</h3><p>{plan.finalProject.description}</p>{plan.finalProject.deliverables?.length > 0 && <div className="deliverables">{plan.finalProject.deliverables.map((item, index) => <span key={`${item}-${index}`}><Check size={12} />{item}</span>)}</div>}</div><span className="project-role"><BriefcaseBusiness size={14} /> {role}</span></div>
    </section>
  )
}

function DayCard({ day, done, onToggle }: { day: DayPlan; done: boolean; onToggle: () => void }) {
  return (
    <details className={`day-card ${done ? 'day-done' : ''}`} open={day.day === 1}>
      <summary><span className="day-number">{String(day.day).padStart(2, '0')}</span><span className="day-summary"><strong>{day.topic}</strong><span><Clock3 size={12} />{day.minutes} min</span></span><ChevronDown className="day-chevron" size={16} /></summary>
      <div className="day-details"><div className="detail-block"><span className="detail-label">LEARN</span><PointList items={day.learn} /></div><div className="detail-block"><span className="detail-label">PRACTICE</span><p className="practice-copy">{day.practice}</p></div>{day.resources.length > 0 && <div className="resource-links"><span className="detail-label">RESOURCES</span>{day.resources.map((resource) => <LinkOut key={resource.id || resource.url} href={resource.url}>{resource.title}</LinkOut>)}</div>}<button className={`complete-button ${done ? 'completed' : ''}`} onClick={onToggle} type="button">{done ? <><Check size={14} /> Completed</> : <><Plus size={14} /> Mark complete</>}</button></div>
    </details>
  )
}

function ResumeDashboard({ analysis, role }: { analysis: ResumeAnalysis; role: string }) {
  const scoreNames: Record<string, string> = { skillsMatch: 'Skills match', keywords: 'Keywords', experienceProjects: 'Experience & projects', education: 'Education', structure: 'Structure', formatting: 'Formatting' }
  return (
    <section className="resume-results" aria-label="Resume analysis results">
      <div className="section-title-row"><div><p className="eyebrow"><span className="eyebrow-line" />YOUR ROLE MATCH</p><h2>Resume review</h2></div><span className="role-chip"><BriefcaseBusiness size={14} />{role}</span></div>
      <div className="resume-overview">
        <div className="score-panel panel"><div className="score-label"><Gauge size={15} /> AI-ESTIMATED ATS COMPATIBILITY</div><div className="score-layout"><div className="score-ring" style={{ '--score': `${analysis.atsScore}%` } as React.CSSProperties}><div><strong>{analysis.atsScore}</strong><span>/ 100</span></div></div><div className="score-copy"><h3>{analysis.atsScore >= 80 ? 'Strong alignment' : analysis.atsScore >= 60 ? 'A solid starting point' : 'Room to strengthen'}</h3><p>{analysis.scoreExplanation}</p></div></div><p className="score-disclaimer"><CircleHelp size={13} />An AI estimate for guidance only, not a score from an actual ATS.</p></div>
        <div className="strengths-panel panel"><span className="roadmap-caption">WHAT’S WORKING</span><PointList items={analysis.strengths} /></div>
      </div>
      <div className="breakdown-panel panel"><div className="breakdown-heading"><h3>Score breakdown</h3><span>Weighted compatibility indicators</span></div><div className="breakdown-grid">{Object.entries(analysis.scoreBreakdown).map(([key, value]) => <div className="breakdown-item" key={key}><div><span>{scoreNames[key] || key}</span><strong>{value}</strong></div><div className="mini-track"><span style={{ width: `${value}%` }} /></div></div>)}</div></div>
      <div className="suggestion-grid">
        <SuggestionCard icon={<Target size={16} />} title="Skills to add" tone="mint" items={analysis.skillsToAdd} />
        <SuggestionCard icon={<Sparkles size={16} />} title="Skills to improve" tone="gold" items={analysis.skillsToImprove} />
        <SuggestionCard icon={<GraduationCap size={16} />} title="Certifications to consider" tone="coral" items={analysis.certificationsToConsider} />
        <SuggestionCard icon={<BriefcaseBusiness size={16} />} title="Projects to improve" tone="blue" items={analysis.projectsToImprove} />
        <SuggestionCard icon={<FileText size={16} />} title="Keywords to add" tone="purple" items={analysis.keywordsToAdd} />
        <SuggestionCard icon={<Lightbulb size={16} />} title="Professional summary" tone="gold" items={analysis.summaryImprovements} />
        <SuggestionCard icon={<ArrowDownToLine size={16} />} title="Formatting improvements" tone="mint" items={analysis.formattingImprovements} />
        <SuggestionCard icon={<Check size={16} />} title="Skills already present" tone="blue" items={analysis.existingSkills} />
      </div>
      <div className="resources-layout">
        <div className="resource-panel panel"><div className="resource-panel-heading"><div className="section-icon mint"><BriefcaseBusiness size={16} /></div><div><h3>Where to look next</h3><p>Job portals for your {role} search</p></div></div><div className="portal-list">{analysis.jobPortals.map((portal) => <div className="portal-item" key={portal.name}><div><strong>{portal.name}</strong><span>{portal.purpose} · {portal.relevance}</span></div><LinkOut href={portal.url}>Visit</LinkOut></div>)}</div></div>
        <div className="resource-panel panel"><div className="resource-panel-heading"><div className="section-icon coral"><BookOpen size={16} /></div><div><h3>Application resources</h3><p>Practical, trusted resume guidance</p></div></div><div className="resource-link-list">{analysis.resumeResources.map((resource) => <LinkOut key={resource.url} href={resource.url}>{resource.title}</LinkOut>)}</div><p className="official-note"><ShieldCheck size={13} />Official career and education resources.</p></div>
      </div>
    </section>
  )
}

function SuggestionCard({ icon, title, tone, items }: { icon: ReactNode; title: string; tone: string; items: string[] }) {
  return <article className="suggestion-card panel"><div className={`suggestion-icon ${tone}`}>{icon}</div><h3>{title}</h3><PointList items={items} /></article>
}

function DashboardView({ plan, summary, interviewPrep, completedDays, onNavigate }: {
  plan: CareerPlan | null
  summary: ResumeSummary | null
  interviewPrep: InterviewPreparation | null
  completedDays: number[]
  onNavigate: (mode: Mode) => void
}) {
  const targetRole = plan?.targetRole || summary?.targetRole || 'Set your target role'
  const remainingDays = plan ? Math.max(0, plan.days.length - completedDays.length) : 30
  const progress = plan ? Math.round(completedDays.length / plan.days.length * 100) : 0
  const missingSkills = plan?.skillGap.missingSkills || summary?.missingSkills || []
  return (
    <section className="page-wrap dashboard-view" aria-labelledby="dashboard-title">
      <div className="page-heading">
        <div><p className="eyebrow"><span className="eyebrow-line" />YOUR CAREER AT A GLANCE</p><h1 id="dashboard-title">Your next steps, <em>in focus.</em></h1><p className="page-intro">A simple overview of your role match, learning progress and preparation.</p></div>
        <div className="role-chip"><BriefcaseBusiness size={14} />{targetRole}</div>
      </div>
      <div className="dash-stat-grid">
        <article className="dash-stat panel"><span className="dash-stat-label"><Target size={14} />CAREER READINESS</span><strong>{plan ? `${plan.skillGap.readinessPercent}%` : '--'}</strong><span>{plan ? `${plan.skillGap.matchingSkills.length} of ${plan.skillGap.requiredSkills.length} role skills matched` : 'Generate your learning plan to calculate'}</span></article>
        <article className="dash-stat panel"><span className="dash-stat-label"><Gauge size={14} />RESUME ATS ESTIMATE</span><strong>{summary ? `${summary.atsScore}<small> / 100</small>` : '--'}</strong><span>{summary ? 'AI-estimated compatibility' : 'Analyze a resume to see your estimate'}</span></article>
        <article className="dash-stat panel"><span className="dash-stat-label"><Clock3 size={14} />30-DAY PROGRESS</span><strong>{plan ? `${completedDays.length}<small> / ${plan.days.length}</small>` : '0<small> / 30</small>'}</strong><span>{plan ? `${remainingDays} days remaining · ${progress}% complete` : 'Generate a plan to start tracking'}</span></article>
        <article className="dash-stat panel"><span className="dash-stat-label"><BrainCircuit size={14} />INTERVIEW PREP</span><strong className="dash-status">{interviewPrep ? 'Ready' : 'Not started'}</strong><span>{interviewPrep ? 'Four question sets saved for practice' : 'Generate role-specific questions and answers'}</span></article>
      </div>
      <div className="dash-content-grid">
        <section className="dash-panel panel">
          <div className="dash-panel-heading"><div><span className="roadmap-caption">SKILL GAP</span><h2>{plan ? `${plan.skillGap.missingSkills.length} skills to build` : 'Build your role match'}</h2></div><button className="text-action" onClick={() => onNavigate('career')} type="button">{plan ? 'Open plan' : 'Create plan'} <ArrowUpRight size={13} /></button></div>
          {plan ? <><div className="dash-readiness"><div><strong>{plan.skillGap.readinessPercent}%</strong><span>career readiness</span></div><div className="progress-track"><span style={{ width: `${plan.skillGap.readinessPercent}%` }} /></div></div><h3 className="dash-subheading">Important missing skills</h3><TagList items={missingSkills.slice(0, 8)} empty="Your listed skills match the identified role requirements." /><h3 className="dash-subheading matched-heading">Already matched</h3><TagList items={plan.skillGap.matchingSkills.slice(0, 8)} empty="Generate the Career Guide to compare your skills." /></> : <p className="empty-copy">Your current skills are compared with target-role skills from your Career Guide plan.</p>}
        </section>
        <section className="dash-panel panel">
          <div className="dash-panel-heading"><div><span className="roadmap-caption">YOUR TOOLKIT</span><h2>Keep the momentum</h2></div><Sparkles size={17} className="dash-spark" /></div>
          <button className="dash-action-row" onClick={() => onNavigate('career')} type="button"><span className="section-icon mint"><BookOpen size={16} /></span><span><strong>Career Guide</strong><small>{plan ? `${remainingDays} learning days left` : 'Create a personalized 30-day plan'}</small></span><ArrowUpRight size={14} /></button>
          <button className="dash-action-row" onClick={() => onNavigate('resume')} type="button"><span className="section-icon coral"><FileText size={16} /></span><span><strong>Resume Analyzer</strong><small>{summary ? `Latest score: ${summary.atsScore} / 100` : 'Get role-specific resume feedback'}</small></span><ArrowUpRight size={14} /></button>
          <button className="dash-action-row" onClick={() => onNavigate('interview')} type="button"><span className="section-icon gold"><BrainCircuit size={16} /></span><span><strong>Interview Preparation</strong><small>{interviewPrep ? 'Review your saved question sets' : 'Practice technical, coding and HR questions'}</small></span><ArrowUpRight size={14} /></button>
        </section>
      </div>
    </section>
  )
}

function JobDescriptionResults({ analysis }: { analysis: JobDescriptionAnalysis }) {
  return (
    <section className="jd-results" aria-label="Job description comparison">
      <div className="section-title-row"><div><p className="eyebrow"><span className="eyebrow-line" />RESUME VS. JOB DESCRIPTION</p><h2>Make the match clearer.</h2></div><span className="role-chip"><Check size={14} />Role comparison</span></div>
      <div className="jd-results-grid">
        <SuggestionCard icon={<Check size={16} />} title="Matched skills" tone="mint" items={analysis.matchedSkills} />
        <SuggestionCard icon={<Target size={16} />} title="Missing skills" tone="coral" items={analysis.missingSkills} />
        <SuggestionCard icon={<FileText size={16} />} title="Important keywords" tone="purple" items={analysis.importantKeywords} />
        <SuggestionCard icon={<Lightbulb size={16} />} title="Resume changes" tone="gold" items={analysis.recommendedResumeChanges} />
        <SuggestionCard icon={<BrainCircuit size={16} />} title="Interview topics" tone="blue" items={analysis.interviewTopics} />
      </div>
    </section>
  )
}

function InterviewView({ role, interviewPrep, busy, error, onSubmit, onGoToCareer }: {
  role: string
  interviewPrep: InterviewPreparation | null
  busy: boolean
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onGoToCareer: () => void
}) {
  const categories = [
    { key: 'technicalQuestions', title: 'Technical questions', icon: <Gauge size={16} />, tone: 'mint' },
    { key: 'codingQuestions', title: 'Coding & programming', icon: <FileText size={16} />, tone: 'blue' },
    { key: 'projectQuestions', title: 'Project deep dive', icon: <BriefcaseBusiness size={16} />, tone: 'gold' },
    { key: 'hrQuestions', title: 'HR & behavioral', icon: <BrainCircuit size={16} />, tone: 'coral' },
  ] as const
  return (
    <section className="page-wrap interview-view" aria-labelledby="interview-title">
      <div className="page-heading">
        <div><p className="eyebrow"><span className="eyebrow-line" />PRACTICE WITH PURPOSE</p><h1 id="interview-title">Walk in <em>well prepared.</em></h1><p className="page-intro">Role-specific questions with concise answers to help you practice out loud.</p></div>
        <div className="heading-stamp document-stamp"><BrainCircuit size={23} /><small>INTERVIEW<br />PRACTICE</small></div>
      </div>
      <div className="interview-controls panel">
        <div><span className="roadmap-caption">PREPARING FOR</span><h2>{role || 'Your target role'}</h2><p>{interviewPrep ? 'Your question sets are saved on this device.' : 'Questions use your Career Guide skills and, when available, resume analysis.'}</p></div>
        <form onSubmit={onSubmit}><button className="primary-button" type="submit" disabled={busy || !role}>{busy ? <><LoaderCircle className="spin" size={16} /> Building questions…</> : <><Sparkles size={16} /> {interviewPrep ? 'Refresh questions' : 'Generate questions'}</>}</button>{!role && <button className="text-action" type="button" onClick={onGoToCareer}>Set role & skills first <ArrowUpRight size={13} /></button>}</form>
      </div>
      {error && <div className="error-message interview-error" role="alert"><CircleHelp size={15} />{error}</div>}
      {interviewPrep ? <div className="interview-category-grid">{categories.map(({ key, title, icon, tone }) => <section className="interview-category panel" key={key}><div className="interview-category-heading"><span className={`suggestion-icon ${tone}`}>{icon}</span><div><h2>{title}</h2><span>{interviewPrep[key].length} questions</span></div></div><div className="question-list">{interviewPrep[key].map((item, index) => <QuestionAnswer key={`${key}-${index}`} number={index + 1} item={item} />)}</div></section>)}</div> : <div className="empty-interview panel"><BrainCircuit size={25} /><h2>Your practice set will appear here.</h2><p>Generate questions for the saved role and skills. Answers are short prompts, not scripts to memorize.</p></div>}
    </section>
  )
}

function QuestionAnswer({ number, item }: { number: number; item: { question: string; answer: string } }) {
  return <details className="question-item"><summary><span className="question-number">{String(number).padStart(2, '0')}</span><strong>{item.question}</strong><ChevronDown size={15} /></summary><div className="answer-copy"><span className="detail-label">MODEL ANSWER</span><p>{item.answer}</p></div></details>
}

export default App
