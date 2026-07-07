import { type ChangeEvent, type CSSProperties, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BadgeCheck,
  Bike,
  CalendarDays,
  ChevronRight,
  Download,
  Dumbbell,
  Flame,
  HeartPulse,
  Moon,
  Plus,
  RefreshCcw,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Upload,
  Waves,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

type Theme = 'light' | 'dark'
type View = 'dashboard' | 'plan' | 'recovery' | 'insights' | 'data' | 'settings'
type Sport = 'Run' | 'Ride' | 'Swim' | 'Strength'
type Intensity = 'Recovery' | 'Aerobic' | 'Tempo' | 'Threshold'
type WorkoutStatus = 'Planned' | 'Done' | 'Adjusted'

type Workout = {
  id: string
  date: string
  title: string
  sport: Sport
  duration: number
  intensity: Intensity
  load: number
  status: WorkoutStatus
  note: string
}

type RecoveryDay = {
  day: string
  hrv: number
  sleep: number
  soreness: number
  readiness: number
}

type AthleteProfile = {
  name: string
  goal: string
  raceDate: string
  weeklyHours: number
  privacyMode: boolean
}

type TrainingState = {
  profile: AthleteProfile
  workouts: Workout[]
  recovery: RecoveryDay[]
  integrations: Record<'Strava' | 'Apple Health' | 'Fitbit', boolean>
  theme: Theme
}

const storageKey = 'ai-training-plan-mvp-state'

const today = new Date('2026-07-07T09:00:00+05:30')
const isoDate = (offset: number) => {
  const date = new Date(today)
  date.setDate(today.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

const defaultState: TrainingState = {
  profile: {
    name: 'Prabhat',
    goal: 'Build toward a strong September half marathon',
    raceDate: '2026-09-20',
    weeklyHours: 7,
    privacyMode: true,
  },
  integrations: {
    Strava: true,
    'Apple Health': true,
    Fitbit: false,
  },
  theme: 'light',
  recovery: [
    { day: 'Mon', hrv: 66, sleep: 7.4, soreness: 3, readiness: 84 },
    { day: 'Tue', hrv: 62, sleep: 6.8, soreness: 4, readiness: 75 },
    { day: 'Wed', hrv: 59, sleep: 6.2, soreness: 5, readiness: 68 },
    { day: 'Thu', hrv: 64, sleep: 7.8, soreness: 2, readiness: 86 },
    { day: 'Fri', hrv: 61, sleep: 7.1, soreness: 3, readiness: 79 },
    { day: 'Sat', hrv: 58, sleep: 6.4, soreness: 5, readiness: 63 },
    { day: 'Sun', hrv: 67, sleep: 8.0, soreness: 2, readiness: 89 },
  ],
  workouts: [
    {
      id: 'w1',
      date: isoDate(-2),
      title: 'Easy aerobic run',
      sport: 'Run',
      duration: 45,
      intensity: 'Aerobic',
      load: 42,
      status: 'Done',
      note: 'Smooth breathing, kept heart rate low.',
    },
    {
      id: 'w2',
      date: isoDate(-1),
      title: 'Tempo intervals',
      sport: 'Run',
      duration: 52,
      intensity: 'Tempo',
      load: 71,
      status: 'Done',
      note: 'Last rep faded a little, useful signal.',
    },
    {
      id: 'w3',
      date: isoDate(0),
      title: 'Mobility and recovery spin',
      sport: 'Ride',
      duration: 35,
      intensity: 'Recovery',
      load: 20,
      status: 'Adjusted',
      note: 'Reduced from threshold ride because readiness dipped.',
    },
    {
      id: 'w4',
      date: isoDate(1),
      title: 'Strength foundation',
      sport: 'Strength',
      duration: 40,
      intensity: 'Aerobic',
      load: 36,
      status: 'Planned',
      note: 'Single-leg stability and posterior chain.',
    },
    {
      id: 'w5',
      date: isoDate(2),
      title: 'Threshold progression',
      sport: 'Run',
      duration: 60,
      intensity: 'Threshold',
      load: 85,
      status: 'Planned',
      note: 'Only run if HRV rebounds above baseline.',
    },
    {
      id: 'w6',
      date: isoDate(4),
      title: 'Long ride with fueling practice',
      sport: 'Ride',
      duration: 95,
      intensity: 'Aerobic',
      load: 78,
      status: 'Planned',
      note: 'Target 55g carbs per hour.',
    },
  ],
}

const sportIcons = {
  Run: Route,
  Ride: Bike,
  Swim: Waves,
  Strength: Dumbbell,
}

const intensityColor = {
  Recovery: 'var(--blue)',
  Aerobic: 'var(--green)',
  Tempo: 'var(--yellow)',
  Threshold: 'var(--orange)',
}

const navItems: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'recovery', label: 'Recovery', icon: HeartPulse },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'data', label: 'Data', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function App() {
  const [state, setState] = useState<TrainingState>(() => {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return defaultState

    try {
      return { ...defaultState, ...JSON.parse(stored) }
    } catch {
      return defaultState
    }
  })
  const [view, setView] = useState<View>('dashboard')
  const [draftWorkout, setDraftWorkout] = useState({
    title: 'Easy endurance session',
    sport: 'Run' as Sport,
    duration: 45,
    intensity: 'Aerobic' as Intensity,
    date: isoDate(3),
  })

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
    localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const metrics = useMemo(() => getMetrics(state), [state])
  const chartData = useMemo(() => buildChartData(state.workouts), [state.workouts])

  const updateState = (next: Partial<TrainingState>) => {
    setState((current) => ({ ...current, ...next }))
  }

  const updateProfile = (field: keyof AthleteProfile, value: string | number | boolean) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, [field]: value },
    }))
  }

  const addWorkout = () => {
    const load = Math.round(draftWorkout.duration * loadMultiplier(draftWorkout.intensity))
    const workout: Workout = {
      id: crypto.randomUUID(),
      ...draftWorkout,
      load,
      status: 'Planned',
      note: 'Created in the MVP planner.',
    }

    setState((current) => ({
      ...current,
      workouts: [...current.workouts, workout].sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }

  const cycleWorkout = (id: string) => {
    setState((current) => ({
      ...current,
      workouts: current.workouts.map((workout) => {
        if (workout.id !== id) return workout
        const status: WorkoutStatus =
          workout.status === 'Planned' ? 'Done' : workout.status === 'Done' ? 'Adjusted' : 'Planned'
        return { ...workout, status }
      }),
    }))
  }

  const adaptToday = () => {
    setState((current) => ({
      ...current,
      workouts: current.workouts.map((workout) => {
        if (workout.date !== isoDate(0)) return workout
        return {
          ...workout,
          title: 'AI-adjusted recovery session',
          duration: 30,
          intensity: 'Recovery',
          load: 16,
          status: 'Adjusted',
          note: 'Readiness is under target, so intensity moved down.',
        }
      }),
    }))
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ai-training-plan-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const imported = JSON.parse(text) as TrainingState
    setState({ ...defaultState, ...imported })
    event.target.value = ''
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={21} />
          </div>
          <div>
            <p>AI Training Plan</p>
            <span>Product MVP</span>
          </div>
        </div>

        <nav aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={view === item.id ? 'nav-item active' : 'nav-item'}
                key={item.id}
                onClick={() => setView(item.id)}
                type="button"
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-card">
          <div className="pill success">Privacy-first</div>
          <p>No backend in this MVP. Your data is saved locally as JSON in this browser.</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Today, July 7</p>
            <h1>{state.profile.goal}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={adaptToday} title="Adapt today's plan" type="button">
              <RefreshCcw size={18} />
            </button>
            <button
              className="theme-toggle"
              onClick={() => updateState({ theme: state.theme === 'light' ? 'dark' : 'light' })}
              type="button"
            >
              {state.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              {state.theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>
        </header>

        {view === 'dashboard' && (
          <Dashboard
            chartData={chartData}
            metrics={metrics}
            recovery={state.recovery}
            workouts={state.workouts}
            onCycle={cycleWorkout}
            onAdapt={adaptToday}
          />
        )}

        {view === 'plan' && (
          <PlanView
            draftWorkout={draftWorkout}
            setDraftWorkout={setDraftWorkout}
            workouts={state.workouts}
            onAdd={addWorkout}
            onCycle={cycleWorkout}
          />
        )}

        {view === 'recovery' && <RecoveryView recovery={state.recovery} metrics={metrics} />}

        {view === 'insights' && <InsightsView metrics={metrics} workouts={state.workouts} />}

        {view === 'data' && (
          <DataView
            integrations={state.integrations}
            exportJson={exportJson}
            importJson={importJson}
            updateIntegrations={(integrations) => updateState({ integrations })}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            profile={state.profile}
            updateProfile={updateProfile}
            reset={() => setState(defaultState)}
          />
        )}
      </main>
    </div>
  )
}

function Dashboard({
  chartData,
  metrics,
  recovery,
  workouts,
  onCycle,
  onAdapt,
}: {
  chartData: ReturnType<typeof buildChartData>
  metrics: ReturnType<typeof getMetrics>
  recovery: RecoveryDay[]
  workouts: Workout[]
  onCycle: (id: string) => void
  onAdapt: () => void
}) {
  const todayWorkout = workouts.find((workout) => workout.date === isoDate(0))

  return (
    <div className="content-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">AI coach note</p>
          <h2>Keep the momentum, lower the intensity.</h2>
          <p>
            Your readiness is {metrics.readiness} and soreness is trending up. The plan keeps training
            alive today, but shifts the main session into recovery work.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onAdapt} type="button">
              <Sparkles size={17} />
              Apply adjustment
            </button>
            <span className="pill cheerful">+{metrics.streak} day streak</span>
          </div>
        </div>
        <div className="readiness-ring" style={{ '--score': `${metrics.readiness}%` } as CSSProperties}>
          <span>{metrics.readiness}</span>
          <small>readiness</small>
        </div>
      </section>

      <div className="metric-row">
        <Stat label="Weekly load" value={metrics.weeklyLoad} helper="target 310" icon={Flame} tone="orange" />
        <Stat label="Injury risk" value={`${metrics.risk}%`} helper="moderate" icon={ShieldCheck} tone="blue" />
        <Stat label="Race score" value={metrics.raceScore} helper="improving" icon={Trophy} tone="green" />
        <Stat label="Sleep avg" value={`${metrics.sleepAvg}h`} helper="last 7 days" icon={HeartPulse} tone="pink" />
      </div>

      <section className="panel wide">
        <PanelTitle title="Training load" subtitle="Planned and completed load by day" />
        <div className="chart large">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }} />
              <Bar dataKey="load" radius={[8, 8, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.day} fill={intensityColor[entry.intensity]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <PanelTitle title="Today's session" subtitle="Tap status to move it through the plan" />
        {todayWorkout && <WorkoutCard workout={todayWorkout} onCycle={onCycle} featured />}
      </section>

      <section className="panel">
        <PanelTitle title="Recovery signal" subtitle="Readiness trend from local JSON" />
        <div className="chart small">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={recovery}>
              <defs>
                <linearGradient id="readinessFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--green)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis hide domain={[50, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }} />
              <Area dataKey="readiness" stroke="var(--green)" fill="url(#readinessFill)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

function PlanView({
  draftWorkout,
  setDraftWorkout,
  workouts,
  onAdd,
  onCycle,
}: {
  draftWorkout: {
    title: string
    sport: Sport
    duration: number
    intensity: Intensity
    date: string
  }
  setDraftWorkout: React.Dispatch<
    React.SetStateAction<{
      title: string
      sport: Sport
      duration: number
      intensity: Intensity
      date: string
    }>
  >
  workouts: Workout[]
  onAdd: () => void
  onCycle: (id: string) => void
}) {
  return (
    <div className="two-column">
      <section className="panel">
        <PanelTitle title="Plan builder" subtitle="Create a workout and save it into JSON state" />
        <div className="form-stack">
          <label>
            Title
            <input
              value={draftWorkout.title}
              onChange={(event) => setDraftWorkout((draft) => ({ ...draft, title: event.target.value }))}
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={draftWorkout.date}
              onChange={(event) => setDraftWorkout((draft) => ({ ...draft, date: event.target.value }))}
            />
          </label>
          <div className="split-fields">
            <label>
              Sport
              <select
                value={draftWorkout.sport}
                onChange={(event) => setDraftWorkout((draft) => ({ ...draft, sport: event.target.value as Sport }))}
              >
                <option>Run</option>
                <option>Ride</option>
                <option>Swim</option>
                <option>Strength</option>
              </select>
            </label>
            <label>
              Intensity
              <select
                value={draftWorkout.intensity}
                onChange={(event) =>
                  setDraftWorkout((draft) => ({ ...draft, intensity: event.target.value as Intensity }))
                }
              >
                <option>Recovery</option>
                <option>Aerobic</option>
                <option>Tempo</option>
                <option>Threshold</option>
              </select>
            </label>
          </div>
          <label>
            Duration: {draftWorkout.duration} min
            <input
              type="range"
              min="20"
              max="140"
              value={draftWorkout.duration}
              onChange={(event) =>
                setDraftWorkout((draft) => ({ ...draft, duration: Number(event.target.value) }))
              }
            />
          </label>
          <button className="primary-button" onClick={onAdd} type="button">
            <Plus size={17} />
            Add workout
          </button>
        </div>
      </section>

      <section className="panel">
        <PanelTitle title="Week schedule" subtitle="Planned, done, and adjusted sessions" />
        <div className="workout-list">
          {workouts.map((workout) => (
            <WorkoutCard workout={workout} key={workout.id} onCycle={onCycle} />
          ))}
        </div>
      </section>
    </div>
  )
}

function RecoveryView({ recovery, metrics }: { recovery: RecoveryDay[]; metrics: ReturnType<typeof getMetrics> }) {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelTitle title="Recovery cockpit" subtitle="HRV, sleep, soreness, and readiness" />
        <div className="metric-row compact">
          <Stat label="Readiness" value={metrics.readiness} helper="green zone" icon={BadgeCheck} tone="green" />
          <Stat label="HRV avg" value={metrics.hrvAvg} helper="ms" icon={Activity} tone="blue" />
          <Stat label="Sleep" value={`${metrics.sleepAvg}h`} helper="7 day avg" icon={Moon} tone="pink" />
        </div>
        <div className="chart large">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recovery}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }} />
              <Line dataKey="readiness" stroke="var(--green)" strokeWidth={3} dot={{ r: 4 }} />
              <Line dataKey="hrv" stroke="var(--blue)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <PanelTitle title="Recovery guidance" subtitle="Simple decisions, explainable inputs" />
        <div className="insight-list">
          <Insight tone="green" title="Train normally" body="Readiness is strong after sleep above 7.5 hours." />
          <Insight tone="orange" title="Cap intensity" body="If soreness reaches 5, swap threshold for aerobic." />
          <Insight tone="blue" title="Protect consistency" body="Recovery days still count when they preserve the block." />
        </div>
      </section>
    </div>
  )
}

function InsightsView({ metrics, workouts }: { metrics: ReturnType<typeof getMetrics>; workouts: Workout[] }) {
  const completed = workouts.filter((workout) => workout.status === 'Done').length

  return (
    <div className="two-column">
      <section className="panel">
        <PanelTitle title="AI insights" subtitle="Generated from the local MVP data" />
        <div className="insight-list">
          <Insight
            tone="green"
            title="Load is productive"
            body={`You completed ${completed} key sessions and your weekly load is ${metrics.weeklyLoad}. Hold this range before adding volume.`}
          />
          <Insight
            tone="orange"
            title="Risk is watchable"
            body={`Current risk is ${metrics.risk}%. The main driver is one threshold day close to a lower-readiness day.`}
          />
          <Insight
            tone="pink"
            title="Fueling opportunity"
            body="Add carbs to the long ride and keep a short note after. The next model step can compare fueling with perceived fatigue."
          />
        </div>
      </section>
      <section className="panel celebration">
        <Trophy size={36} />
        <h2>Consistency score: {metrics.raceScore}</h2>
        <p>
          The MVP rewards steady execution, honest recovery, and useful notes. It feels positive without
          turning training into a toy.
        </p>
        <div className="badge-grid">
          <span className="pill success">Load on target</span>
          <span className="pill cheerful">Recovery respected</span>
          <span className="pill warm">Race model warming up</span>
        </div>
      </section>
    </div>
  )
}

function DataView({
  integrations,
  exportJson,
  importJson,
  updateIntegrations,
}: {
  integrations: TrainingState['integrations']
  exportJson: () => void
  importJson: (event: ChangeEvent<HTMLInputElement>) => void
  updateIntegrations: (integrations: TrainingState['integrations']) => void
}) {
  return (
    <div className="two-column">
      <section className="panel">
        <PanelTitle title="Data sources" subtitle="MVP toggles for future integrations" />
        <div className="integration-list">
          {(Object.keys(integrations) as Array<keyof typeof integrations>).map((name) => (
            <button
              className={integrations[name] ? 'integration connected' : 'integration'}
              key={name}
              onClick={() => updateIntegrations({ ...integrations, [name]: !integrations[name] })}
              type="button"
            >
              <span>
                <ShieldCheck size={18} />
                {name}
              </span>
              <strong>{integrations[name] ? 'Connected' : 'Off'}</strong>
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <PanelTitle title="JSON storage" subtitle="Export, import, and keep ownership of data" />
        <div className="data-actions">
          <button className="primary-button" onClick={exportJson} type="button">
            <Download size={17} />
            Export JSON
          </button>
          <label className="upload-button">
            <Upload size={17} />
            Import JSON
            <input accept="application/json" onChange={importJson} type="file" />
          </label>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={20} />
          <p>
            This MVP stores everything in browser localStorage and exported JSON. It is ready for GitHub
            Pages because it needs no server.
          </p>
        </div>
      </section>
    </div>
  )
}

function SettingsView({
  profile,
  updateProfile,
  reset,
}: {
  profile: AthleteProfile
  updateProfile: (field: keyof AthleteProfile, value: string | number | boolean) => void
  reset: () => void
}) {
  return (
    <div className="two-column">
      <section className="panel">
        <PanelTitle title="Athlete profile" subtitle="Personalize the plan locally" />
        <div className="form-stack">
          <label>
            Name
            <input value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} />
          </label>
          <label>
            Goal
            <textarea value={profile.goal} onChange={(event) => updateProfile('goal', event.target.value)} />
          </label>
          <label>
            Race date
            <input type="date" value={profile.raceDate} onChange={(event) => updateProfile('raceDate', event.target.value)} />
          </label>
          <label>
            Weekly hours: {profile.weeklyHours}
            <input
              type="range"
              min="3"
              max="14"
              value={profile.weeklyHours}
              onChange={(event) => updateProfile('weeklyHours', Number(event.target.value))}
            />
          </label>
        </div>
      </section>
      <section className="panel">
        <PanelTitle title="Product controls" subtitle="Reset demo state or keep privacy mode on" />
        <button
          className={profile.privacyMode ? 'integration connected' : 'integration'}
          onClick={() => updateProfile('privacyMode', !profile.privacyMode)}
          type="button"
        >
          <span>
            <ShieldCheck size={18} />
            Privacy mode
          </span>
          <strong>{profile.privacyMode ? 'On' : 'Off'}</strong>
        </button>
        <button className="secondary-button danger" onClick={reset} type="button">
          Reset demo data
        </button>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  helper: string
  icon: typeof Activity
  tone: 'green' | 'orange' | 'blue' | 'pink'
}) {
  return (
    <section className={`stat ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
      <Icon size={22} />
    </section>
  )
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <ChevronRight size={18} />
    </div>
  )
}

function WorkoutCard({
  workout,
  onCycle,
  featured,
}: {
  workout: Workout
  onCycle: (id: string) => void
  featured?: boolean
}) {
  const Icon = sportIcons[workout.sport]

  return (
    <article className={featured ? 'workout-card featured' : 'workout-card'}>
      <div className="workout-main">
        <span className="sport-icon" style={{ color: intensityColor[workout.intensity] }}>
          <Icon size={18} />
        </span>
        <div>
          <h3>{workout.title}</h3>
          <p>
            {workout.date} • {workout.duration} min • load {workout.load}
          </p>
        </div>
      </div>
      <p className="workout-note">{workout.note}</p>
      <div className="workout-footer">
        <span className="pill" style={{ background: intensityColor[workout.intensity] }}>
          {workout.intensity}
        </span>
        <button onClick={() => onCycle(workout.id)} type="button">
          {workout.status}
        </button>
      </div>
    </article>
  )
}

function Insight({ tone, title, body }: { tone: 'green' | 'orange' | 'blue' | 'pink'; title: string; body: string }) {
  return (
    <article className={`insight ${tone}`}>
      <Target size={18} />
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  )
}

function getMetrics(state: TrainingState) {
  const weeklyLoad = state.workouts.reduce((total, workout) => total + workout.load, 0)
  const readiness = Math.round(
    state.recovery.reduce((total, day) => total + day.readiness, 0) / state.recovery.length,
  )
  const sleepAvg = (
    state.recovery.reduce((total, day) => total + day.sleep, 0) / state.recovery.length
  ).toFixed(1)
  const hrvAvg = Math.round(state.recovery.reduce((total, day) => total + day.hrv, 0) / state.recovery.length)
  const hardLoad = state.workouts
    .filter((workout) => workout.intensity === 'Tempo' || workout.intensity === 'Threshold')
    .reduce((total, workout) => total + workout.load, 0)
  const risk = Math.min(92, Math.max(12, Math.round(hardLoad / 3 + (75 - readiness))))
  const streak = state.workouts.filter((workout) => workout.status === 'Done' || workout.status === 'Adjusted').length
  const raceScore = Math.min(98, Math.round(60 + streak * 5 + readiness / 5))

  return { weeklyLoad, readiness, sleepAvg, hrvAvg, risk, streak, raceScore }
}

function buildChartData(workouts: Workout[]) {
  return workouts.map((workout) => ({
    day: new Date(`${workout.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
    load: workout.load,
    intensity: workout.intensity,
  }))
}

function loadMultiplier(intensity: Intensity) {
  if (intensity === 'Recovery') return 0.45
  if (intensity === 'Aerobic') return 0.85
  if (intensity === 'Tempo') return 1.25
  return 1.45
}

export default App
