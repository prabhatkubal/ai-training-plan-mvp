import { type ChangeEvent, type CSSProperties, type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BadgeCheck,
  Bike,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  Dumbbell,
  FileJson,
  Flame,
  HeartPulse,
  Moon,
  Pencil,
  Plus,
  RefreshCcw,
  Route,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Trophy,
  Upload,
  Waves,
} from 'lucide-react'
import {
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
import demoData from './data/demoData.json'
import './App.css'

type Theme = 'light' | 'dark'
type View = 'dashboard' | 'plan' | 'recovery' | 'insights' | 'data' | 'settings'
type Sport = 'Run' | 'Ride' | 'Swim' | 'Strength'
type Intensity = 'Recovery' | 'Aerobic' | 'Tempo' | 'Threshold'
type WorkoutStatus = 'Planned' | 'Done' | 'Adjusted' | 'Skipped'
type IntegrationName = 'Strava' | 'Apple Health' | 'Fitbit'
type Tone = 'green' | 'orange' | 'blue' | 'pink'

type Workout = {
  id: string
  date: string
  title: string
  sport: Sport
  duration: number
  distance: number
  intensity: Intensity
  load: number
  status: WorkoutStatus
  rpe: number
  fueling: string
  note: string
}

type RecoveryDay = {
  date: string
  day: string
  hrv: number
  sleep: number
  soreness: number
  readiness: number
  restingHr: number
  mood: string
}

type AthleteProfile = {
  name: string
  sportFocus: string
  goal: string
  raceDate: string
  weeklyHours: number
  experience: string
  privacyMode: boolean
  units: 'Metric' | 'Imperial'
  notifications: boolean
}

type ActivitySource = {
  source: IntegrationName
  label: string
  syncedAt: string
  status: 'Synced' | 'Off'
  detail: string
}

type BloodMarker = {
  name: string
  value: number
  unit: string
  status: string
  note: string
}

type RacePrediction = {
  event: string
  current: string
  target: string
  confidence: number
}

type Achievement = {
  title: string
  detail: string
  tone: 'green' | 'blue' | 'orange'
}

type TrainingState = {
  profile: AthleteProfile
  workouts: Workout[]
  recovery: RecoveryDay[]
  integrations: Record<IntegrationName, boolean>
  activities: ActivitySource[]
  bloodMarkers: BloodMarker[]
  racePredictions: RacePrediction[]
  achievements: Achievement[]
  theme: Theme
}

const storageKey = 'ai-training-plan-mvp-state-v2'
const todayIso = '2026-07-08'
const typedDemoData = demoData as unknown as TrainingState

const navItems: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'recovery', label: 'Recovery', icon: HeartPulse },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
]

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

function App() {
  const [state, setState] = useState<TrainingState>(() => loadState())
  const [view, setView] = useState<View>('dashboard')
  const [draftWorkout, setDraftWorkout] = useState(newDraftWorkout())
  const [recoveryDraft, setRecoveryDraft] = useState(newRecoveryDraft(state.recovery))
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(state.workouts[0]?.id ?? '')
  const [importError, setImportError] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
    localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const metrics = useMemo(() => getMetrics(state), [state])
  const chartData = useMemo(() => buildChartData(state.workouts), [state.workouts])
  const todayWorkout = state.workouts.find((workout) => workout.date === todayIso)
  const selectedWorkout =
    state.workouts.find((workout) => workout.id === selectedWorkoutId) ?? state.workouts[0]

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
      id: `w-${crypto.randomUUID()}`,
      ...draftWorkout,
      load,
      status: 'Planned',
      rpe: 0,
      note: draftWorkout.note || 'Created in the demo planner.',
    }

    setState((current) => ({
      ...current,
      workouts: [...current.workouts, workout].sort((a, b) => a.date.localeCompare(b.date)),
    }))
    setDraftWorkout(newDraftWorkout())
    setSelectedWorkoutId(workout.id)
  }

  const updateWorkout = (id: string, patch: Partial<Workout>) => {
    setState((current) => ({
      ...current,
      workouts: current.workouts.map((workout) =>
        workout.id === id
          ? {
              ...workout,
              ...patch,
              load:
                patch.duration !== undefined || patch.intensity !== undefined
                  ? Math.round((patch.duration ?? workout.duration) * loadMultiplier(patch.intensity ?? workout.intensity))
                  : workout.load,
            }
          : workout,
      ),
    }))
  }

  const deleteWorkout = (id: string) => {
    setState((current) => ({
      ...current,
      workouts: current.workouts.filter((workout) => workout.id !== id),
    }))
    setSelectedWorkoutId(state.workouts.find((workout) => workout.id !== id)?.id ?? '')
  }

  const cycleWorkout = (id: string) => {
    const statusOrder: WorkoutStatus[] = ['Planned', 'Done', 'Adjusted', 'Skipped']
    const workout = state.workouts.find((item) => item.id === id)
    if (!workout) return
    const next = statusOrder[(statusOrder.indexOf(workout.status) + 1) % statusOrder.length]
    updateWorkout(id, { status: next, rpe: next === 'Done' ? Math.max(workout.rpe, 5) : workout.rpe })
  }

  const adaptToday = () => {
    if (!todayWorkout) return
    updateWorkout(todayWorkout.id, {
      title: 'AI-adjusted aerobic reset',
      duration: 32,
      intensity: 'Recovery',
      status: 'Adjusted',
      note: 'Readiness is positive, but recent threshold load is high. Keep the chain alive without stacking fatigue.',
      fueling: 'Hydrate and eat normally',
    })
  }

  const saveRecovery = () => {
    const nextDay: RecoveryDay = {
      ...recoveryDraft,
      day: new Date(`${recoveryDraft.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
      readiness: calculateReadiness(recoveryDraft),
    }

    setState((current) => ({
      ...current,
      recovery: [
        ...current.recovery.filter((day) => day.date !== nextDay.date),
        nextDay,
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }))
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ai-training-plan-demo-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const imported = JSON.parse(text) as TrainingState
      assertValidState(imported)
      setState(imported)
      setImportError('')
    } catch {
      setImportError('That file did not match the AI Training Plan JSON shape.')
    } finally {
      event.target.value = ''
    }
  }

  const resetDemo = () => {
    setState(typedDemoData)
    setRecoveryDraft(newRecoveryDraft(typedDemoData.recovery))
    setDraftWorkout(newDraftWorkout())
    setSelectedWorkoutId(typedDemoData.workouts[0]?.id ?? '')
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
            <span>Frontend demo</span>
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
          <div className="pill success">Local JSON</div>
          <p>{state.workouts.length} workouts, {state.recovery.length} recovery logs, and {state.activities.length} source events are saved in this browser.</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Today, July 8</p>
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
            state={state}
            todayWorkout={todayWorkout}
            onAdapt={adaptToday}
            onCycle={cycleWorkout}
          />
        )}

        {view === 'plan' && (
          <PlanView
            draftWorkout={draftWorkout}
            selectedWorkout={selectedWorkout}
            selectedWorkoutId={selectedWorkoutId}
            setDraftWorkout={setDraftWorkout}
            setSelectedWorkoutId={setSelectedWorkoutId}
            workouts={state.workouts}
            onAdd={addWorkout}
            onCycle={cycleWorkout}
            onDelete={deleteWorkout}
            onUpdate={updateWorkout}
          />
        )}

        {view === 'recovery' && (
          <RecoveryView
            metrics={metrics}
            recovery={state.recovery}
            recoveryDraft={recoveryDraft}
            setRecoveryDraft={setRecoveryDraft}
            onSave={saveRecovery}
          />
        )}

        {view === 'insights' && <InsightsView metrics={metrics} state={state} onAdapt={adaptToday} />}

        {view === 'data' && (
          <DataView
            importError={importError}
            state={state}
            exportJson={exportJson}
            importJson={importJson}
            resetDemo={resetDemo}
            updateIntegrations={(integrations) => updateState({ integrations })}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            profile={state.profile}
            updateProfile={updateProfile}
            reset={resetDemo}
          />
        )}
      </main>
    </div>
  )
}

function Dashboard({
  chartData,
  metrics,
  state,
  todayWorkout,
  onAdapt,
  onCycle,
}: {
  chartData: ReturnType<typeof buildChartData>
  metrics: ReturnType<typeof getMetrics>
  state: TrainingState
  todayWorkout?: Workout
  onAdapt: () => void
  onCycle: (id: string) => void
}) {
  const coachNote = getCoachNote(metrics)
  const nextThree = state.workouts.filter((workout) => workout.date >= todayIso).slice(0, 3)

  return (
    <div className="content-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">AI coach note</p>
          <h2>{coachNote.title}</h2>
          <p>{coachNote.body}</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onAdapt} type="button">
              <Sparkles size={17} />
              Apply adjustment
            </button>
            <span className="pill cheerful">{metrics.streak} logged sessions</span>
            <span className="pill warm">{metrics.daysToRace} days to race</span>
          </div>
        </div>
        <div className="readiness-ring" style={{ '--score': `${metrics.readiness}%` } as CSSProperties}>
          <span>{metrics.readiness}</span>
          <small>readiness</small>
        </div>
      </section>

      <div className="metric-row">
        <Stat label="Weekly load" value={metrics.weeklyLoad} helper={`target ${metrics.targetLoad}`} icon={Flame} tone="orange" />
        <Stat label="Injury risk" value={`${metrics.risk}%`} helper={metrics.riskLabel} icon={ShieldCheck} tone="blue" />
        <Stat label="Race score" value={metrics.raceScore} helper="improving" icon={Trophy} tone="green" />
        <Stat label="Sleep avg" value={`${metrics.sleepAvg}h`} helper="last logs" icon={HeartPulse} tone="pink" />
      </div>

      <section className="panel wide">
        <PanelTitle icon={Activity} title="Training load" subtitle="Completed and planned load from seeded JSON" />
        <div className="chart large">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }} />
              <Bar dataKey="load" radius={[8, 8, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`${entry.date}-${entry.title}`} fill={intensityColor[entry.intensity]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={CalendarDays} title="Today" subtitle="Status button cycles planned, done, adjusted, skipped" />
        {todayWorkout ? (
          <WorkoutCard workout={todayWorkout} onCycle={onCycle} featured />
        ) : (
          <EmptyState title="No workout today" body="Add one from the Plan tab." />
        )}
      </section>

      <section className="panel">
        <PanelTitle icon={Target} title="Next sessions" subtitle="What the athlete sees next" />
        <div className="mini-list">
          {nextThree.map((workout) => (
            <div className="mini-row" key={workout.id}>
              <span style={{ background: intensityColor[workout.intensity] }} />
              <div>
                <strong>{workout.title}</strong>
                <small>{formatShortDate(workout.date)} - {workout.duration} min - {workout.status}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Database} title="Source feed" subtitle="Latest connected-data events" />
        <div className="activity-feed">
          {state.activities.map((activity) => (
            <ActivityItem activity={activity} key={activity.source} />
          ))}
        </div>
      </section>
    </div>
  )
}

function PlanView({
  draftWorkout,
  selectedWorkout,
  selectedWorkoutId,
  setDraftWorkout,
  setSelectedWorkoutId,
  workouts,
  onAdd,
  onCycle,
  onDelete,
  onUpdate,
}: {
  draftWorkout: ReturnType<typeof newDraftWorkout>
  selectedWorkout?: Workout
  selectedWorkoutId: string
  setDraftWorkout: Dispatch<SetStateAction<ReturnType<typeof newDraftWorkout>>>
  setSelectedWorkoutId: (id: string) => void
  workouts: Workout[]
  onAdd: () => void
  onCycle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Workout>) => void
}) {
  const weeklyDistance = workouts.reduce((sum, workout) => sum + workout.distance, 0).toFixed(1)

  return (
    <div className="three-column">
      <section className="panel">
        <PanelTitle icon={Plus} title="Add workout" subtitle="Creates a saved JSON workout" />
        <div className="form-stack">
          <label>
            Title
            <input
              value={draftWorkout.title}
              onChange={(event) => setDraftWorkout((draft) => ({ ...draft, title: event.target.value }))}
            />
          </label>
          <div className="split-fields">
            <label>
              Date
              <input
                type="date"
                value={draftWorkout.date}
                onChange={(event) => setDraftWorkout((draft) => ({ ...draft, date: event.target.value }))}
              />
            </label>
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
          </div>
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
          <div className="split-fields">
            <label>
              Duration: {draftWorkout.duration} min
              <input
                type="range"
                min="15"
                max="150"
                value={draftWorkout.duration}
                onChange={(event) =>
                  setDraftWorkout((draft) => ({ ...draft, duration: Number(event.target.value) }))
                }
              />
            </label>
            <label>
              Distance
              <input
                type="number"
                min="0"
                step="0.1"
                value={draftWorkout.distance}
                onChange={(event) =>
                  setDraftWorkout((draft) => ({ ...draft, distance: Number(event.target.value) }))
                }
              />
            </label>
          </div>
          <label>
            Fueling note
            <input
              value={draftWorkout.fueling}
              onChange={(event) => setDraftWorkout((draft) => ({ ...draft, fueling: event.target.value }))}
            />
          </label>
          <label>
            Coach note
            <textarea
              value={draftWorkout.note}
              onChange={(event) => setDraftWorkout((draft) => ({ ...draft, note: event.target.value }))}
            />
          </label>
          <button className="primary-button" onClick={onAdd} type="button">
            <Plus size={17} />
            Add to plan
          </button>
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={CalendarDays} title="Plan calendar" subtitle={`${workouts.length} sessions - ${weeklyDistance} km`} />
        <div className="workout-list">
          {workouts.map((workout) => (
            <button
              className={selectedWorkoutId === workout.id ? 'workout-select active' : 'workout-select'}
              key={workout.id}
              onClick={() => setSelectedWorkoutId(workout.id)}
              type="button"
            >
              <WorkoutCard workout={workout} onCycle={onCycle} compact />
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Pencil} title="Session editor" subtitle="Change the selected workout" />
        {selectedWorkout ? (
          <WorkoutEditor workout={selectedWorkout} onDelete={onDelete} onUpdate={onUpdate} />
        ) : (
          <EmptyState title="Select a workout" body="Choose any session to edit details." />
        )}
      </section>
    </div>
  )
}

function RecoveryView({
  metrics,
  recovery,
  recoveryDraft,
  setRecoveryDraft,
  onSave,
}: {
  metrics: ReturnType<typeof getMetrics>
  recovery: RecoveryDay[]
  recoveryDraft: ReturnType<typeof newRecoveryDraft>
  setRecoveryDraft: Dispatch<SetStateAction<ReturnType<typeof newRecoveryDraft>>>
  onSave: () => void
}) {
  const newest = recovery.at(-1)

  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelTitle icon={HeartPulse} title="Recovery cockpit" subtitle="HRV, sleep, soreness, readiness, and resting HR" />
        <div className="metric-row compact">
          <Stat label="Readiness" value={metrics.readiness} helper={newest?.mood ?? 'latest'} icon={BadgeCheck} tone="green" />
          <Stat label="HRV avg" value={metrics.hrvAvg} helper="ms" icon={Activity} tone="blue" />
          <Stat label="Resting HR" value={metrics.restingHrAvg} helper="bpm avg" icon={HeartPulse} tone="pink" />
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
              <Line dataKey="restingHr" stroke="var(--pink)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Save} title="Log recovery" subtitle="Saves or updates a date in JSON" />
        <div className="form-stack">
          <label>
            Date
            <input
              type="date"
              value={recoveryDraft.date}
              onChange={(event) => setRecoveryDraft((draft) => ({ ...draft, date: event.target.value }))}
            />
          </label>
          <div className="split-fields">
            <label>
              HRV
              <input
                type="number"
                value={recoveryDraft.hrv}
                onChange={(event) => setRecoveryDraft((draft) => ({ ...draft, hrv: Number(event.target.value) }))}
              />
            </label>
            <label>
              Sleep
              <input
                type="number"
                step="0.1"
                value={recoveryDraft.sleep}
                onChange={(event) => setRecoveryDraft((draft) => ({ ...draft, sleep: Number(event.target.value) }))}
              />
            </label>
          </div>
          <div className="split-fields">
            <label>
              Soreness: {recoveryDraft.soreness}
              <input
                type="range"
                min="1"
                max="10"
                value={recoveryDraft.soreness}
                onChange={(event) => setRecoveryDraft((draft) => ({ ...draft, soreness: Number(event.target.value) }))}
              />
            </label>
            <label>
              Resting HR
              <input
                type="number"
                value={recoveryDraft.restingHr}
                onChange={(event) => setRecoveryDraft((draft) => ({ ...draft, restingHr: Number(event.target.value) }))}
              />
            </label>
          </div>
          <label>
            Mood
            <input
              value={recoveryDraft.mood}
              onChange={(event) => setRecoveryDraft((draft) => ({ ...draft, mood: event.target.value }))}
            />
          </label>
          <div className="computed-card">
            <span>Calculated readiness</span>
            <strong>{calculateReadiness(recoveryDraft)}</strong>
          </div>
          <button className="primary-button" onClick={onSave} type="button">
            <Save size={17} />
            Save recovery log
          </button>
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Sparkles} title="Recovery guidance" subtitle="Explainable suggestions" />
        <div className="insight-list">
          <Insight tone="green" title="Train normally" body="Readiness is above baseline when sleep clears 7.5 hours and soreness stays below 4." />
          <Insight tone="orange" title="Cap intensity" body="If soreness reaches 5 or HRV drops below 60, swap threshold work for aerobic." />
          <Insight tone="blue" title="Protect consistency" body="A recovery day still counts when it keeps the athlete healthy enough to complete the block." />
        </div>
      </section>
    </div>
  )
}

function InsightsView({
  metrics,
  state,
  onAdapt,
}: {
  metrics: ReturnType<typeof getMetrics>
  state: TrainingState
  onAdapt: () => void
}) {
  const insights = buildInsights(state, metrics)

  return (
    <div className="content-grid">
      <section className="panel wide">
        <PanelTitle icon={Sparkles} title="AI insight queue" subtitle="Generated from workouts, recovery, fueling, and blood markers" />
        <div className="insight-list">
          {insights.map((insight) => (
            <Insight body={insight.body} key={insight.title} title={insight.title} tone={insight.tone} />
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Trophy} title="Race predictions" subtitle="Demo model confidence" />
        <div className="race-list">
          {state.racePredictions.map((race) => (
            <div className="race-card" key={race.event}>
              <div>
                <strong>{race.event}</strong>
                <small>{race.current} now - target {race.target}</small>
              </div>
              <div className="confidence">
                <span style={{ width: `${race.confidence}%` }} />
              </div>
              <em>{race.confidence}% confidence</em>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Flame} title="Injury risk drivers" subtitle={`${metrics.risk}% current risk`} />
        <div className="risk-bars">
          <RiskBar label="Hard-load concentration" value={metrics.hardLoadShare} />
          <RiskBar label="Sleep debt" value={metrics.sleepDebt} />
          <RiskBar label="Recovery volatility" value={metrics.recoveryVolatility} />
        </div>
        <button className="primary-button full-width" onClick={onAdapt} type="button">
          <Sparkles size={17} />
          Downshift today
        </button>
      </section>

      <section className="panel">
        <PanelTitle icon={BadgeCheck} title="Achievements" subtitle="Quiet gamification layer" />
        <div className="achievement-grid">
          {state.achievements.map((achievement) => (
            <div className={`achievement ${achievement.tone}`} key={achievement.title}>
              <CheckCircle2 size={18} />
              <strong>{achievement.title}</strong>
              <p>{achievement.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function DataView({
  importError,
  state,
  exportJson,
  importJson,
  resetDemo,
  updateIntegrations,
}: {
  importError: string
  state: TrainingState
  exportJson: () => void
  importJson: (event: ChangeEvent<HTMLInputElement>) => void
  resetDemo: () => void
  updateIntegrations: (integrations: TrainingState['integrations']) => void
}) {
  const jsonPreview = JSON.stringify(state, null, 2)

  return (
    <div className="two-column">
      <section className="panel">
        <PanelTitle icon={Database} title="Data sources" subtitle="MVP toggles for future integrations" />
        <div className="integration-list">
          {(Object.keys(state.integrations) as IntegrationName[]).map((name) => (
            <button
              className={state.integrations[name] ? 'integration connected' : 'integration'}
              key={name}
              onClick={() => updateIntegrations({ ...state.integrations, [name]: !state.integrations[name] })}
              type="button"
            >
              <span>
                <ShieldCheck size={18} />
                {name}
              </span>
              <strong>{state.integrations[name] ? 'Connected' : 'Off'}</strong>
            </button>
          ))}
        </div>

        <div className="activity-feed separated">
          {state.activities.map((activity) => (
            <ActivityItem activity={activity} key={activity.source} />
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={FileJson} title="JSON storage" subtitle="Export, import, reset, and inspect all demo data" />
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
          <button className="secondary-button" onClick={resetDemo} type="button">
            <RefreshCcw size={17} />
            Reset seed
          </button>
        </div>
        {importError && <p className="error-text">{importError}</p>}
        <pre className="json-preview">{jsonPreview}</pre>
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
        <PanelTitle icon={Settings} title="Athlete profile" subtitle="Personalize the local demo" />
        <div className="form-stack">
          <label>
            Name
            <input value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} />
          </label>
          <label>
            Sport focus
            <input value={profile.sportFocus} onChange={(event) => updateProfile('sportFocus', event.target.value)} />
          </label>
          <label>
            Goal
            <textarea value={profile.goal} onChange={(event) => updateProfile('goal', event.target.value)} />
          </label>
          <div className="split-fields">
            <label>
              Race date
              <input type="date" value={profile.raceDate} onChange={(event) => updateProfile('raceDate', event.target.value)} />
            </label>
            <label>
              Experience
              <select value={profile.experience} onChange={(event) => updateProfile('experience', event.target.value)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
          </div>
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
        <PanelTitle icon={ShieldCheck} title="Product controls" subtitle="Settings are saved in local JSON state" />
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
        <button
          className={profile.notifications ? 'integration connected' : 'integration'}
          onClick={() => updateProfile('notifications', !profile.notifications)}
          type="button"
        >
          <span>
            <Activity size={18} />
            Smart nudges
          </span>
          <strong>{profile.notifications ? 'On' : 'Off'}</strong>
        </button>
        <div className="segmented">
          {(['Metric', 'Imperial'] as const).map((unit) => (
            <button
              className={profile.units === unit ? 'active' : ''}
              key={unit}
              onClick={() => updateProfile('units', unit)}
              type="button"
            >
              {unit}
            </button>
          ))}
        </div>
        <button className="secondary-button danger" onClick={reset} type="button">
          Reset demo data
        </button>
      </section>
    </div>
  )
}

function WorkoutEditor({
  workout,
  onDelete,
  onUpdate,
}: {
  workout: Workout
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Workout>) => void
}) {
  return (
    <div className="form-stack">
      <label>
        Title
        <input value={workout.title} onChange={(event) => onUpdate(workout.id, { title: event.target.value })} />
      </label>
      <div className="split-fields">
        <label>
          Date
          <input type="date" value={workout.date} onChange={(event) => onUpdate(workout.id, { date: event.target.value })} />
        </label>
        <label>
          Status
          <select value={workout.status} onChange={(event) => onUpdate(workout.id, { status: event.target.value as WorkoutStatus })}>
            <option>Planned</option>
            <option>Done</option>
            <option>Adjusted</option>
            <option>Skipped</option>
          </select>
        </label>
      </div>
      <div className="split-fields">
        <label>
          Duration
          <input type="number" value={workout.duration} onChange={(event) => onUpdate(workout.id, { duration: Number(event.target.value) })} />
        </label>
        <label>
          Distance
          <input type="number" step="0.1" value={workout.distance} onChange={(event) => onUpdate(workout.id, { distance: Number(event.target.value) })} />
        </label>
      </div>
      <div className="split-fields">
        <label>
          Sport
          <select value={workout.sport} onChange={(event) => onUpdate(workout.id, { sport: event.target.value as Sport })}>
            <option>Run</option>
            <option>Ride</option>
            <option>Swim</option>
            <option>Strength</option>
          </select>
        </label>
        <label>
          Intensity
          <select value={workout.intensity} onChange={(event) => onUpdate(workout.id, { intensity: event.target.value as Intensity })}>
            <option>Recovery</option>
            <option>Aerobic</option>
            <option>Tempo</option>
            <option>Threshold</option>
          </select>
        </label>
      </div>
      <label>
        RPE: {workout.rpe}
        <input type="range" min="0" max="10" value={workout.rpe} onChange={(event) => onUpdate(workout.id, { rpe: Number(event.target.value) })} />
      </label>
      <label>
        Fueling
        <input value={workout.fueling} onChange={(event) => onUpdate(workout.id, { fueling: event.target.value })} />
      </label>
      <label>
        Note
        <textarea value={workout.note} onChange={(event) => onUpdate(workout.id, { note: event.target.value })} />
      </label>
      <button className="secondary-button danger" onClick={() => onDelete(workout.id)} type="button">
        <Trash2 size={17} />
        Delete workout
      </button>
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
  tone: Tone
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

function PanelTitle({ icon: Icon, title, subtitle }: { icon: typeof Activity; title: string; subtitle: string }) {
  return (
    <div className="panel-title">
      <div>
        <span className="panel-icon">
          <Icon size={16} />
        </span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}

function WorkoutCard({
  workout,
  onCycle,
  featured,
  compact,
}: {
  workout: Workout
  onCycle: (id: string) => void
  featured?: boolean
  compact?: boolean
}) {
  const Icon = sportIcons[workout.sport]

  return (
    <article className={`${featured ? 'workout-card featured' : 'workout-card'} ${compact ? 'compact' : ''}`}>
      <div className="workout-main">
        <span className="sport-icon" style={{ color: intensityColor[workout.intensity] }}>
          <Icon size={18} />
        </span>
        <div>
          <h3>{workout.title}</h3>
          <p>
            {formatShortDate(workout.date)} - {workout.duration} min - load {workout.load}
          </p>
        </div>
      </div>
      {!compact && <p className="workout-note">{workout.note}</p>}
      <div className="workout-footer">
        <span className="pill" style={{ background: intensityColor[workout.intensity] }}>
          {workout.intensity}
        </span>
        <button onClick={(event) => {
          event.stopPropagation()
          onCycle(workout.id)
        }} type="button">
          {workout.status}
        </button>
      </div>
    </article>
  )
}

function ActivityItem({ activity }: { activity: ActivitySource }) {
  return (
    <div className="activity-item">
      <span className={activity.status === 'Synced' ? 'dot synced' : 'dot'} />
      <div>
        <strong>{activity.source}: {activity.label}</strong>
        <p>{activity.detail}</p>
        <small>{activity.syncedAt}</small>
      </div>
    </div>
  )
}

function Insight({ tone, title, body }: { tone: Tone; title: string; body: string }) {
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

function RiskBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="risk-bar">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="confidence">
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <Sparkles size={22} />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}

function loadState() {
  const stored = localStorage.getItem(storageKey)
  if (!stored) return typedDemoData

  try {
    const parsed = JSON.parse(stored) as TrainingState
    assertValidState(parsed)
    return parsed
  } catch {
    return typedDemoData
  }
}

function assertValidState(value: TrainingState) {
  if (!value.profile || !Array.isArray(value.workouts) || !Array.isArray(value.recovery)) {
    throw new Error('Invalid training state')
  }
}

function newDraftWorkout() {
  return {
    title: 'Easy endurance session',
    sport: 'Run' as Sport,
    duration: 45,
    distance: 7,
    intensity: 'Aerobic' as Intensity,
    date: '2026-07-13',
    fueling: 'Normal meal before',
    note: 'Keep this controlled and conversational.',
  }
}

function newRecoveryDraft(recovery: RecoveryDay[]) {
  const latest = recovery.at(-1)
  return {
    date: todayIso,
    hrv: latest?.hrv ?? 65,
    sleep: latest?.sleep ?? 7.5,
    soreness: latest?.soreness ?? 3,
    restingHr: latest?.restingHr ?? 52,
    mood: latest?.mood ?? 'Fresh',
  }
}

function getMetrics(state: TrainingState) {
  const weeklyLoad = state.workouts.reduce((total, workout) => total + workout.load, 0)
  const completed = state.workouts.filter((workout) => workout.status === 'Done' || workout.status === 'Adjusted')
  const readiness = Math.round(average(state.recovery.map((day) => day.readiness)))
  const sleepAvg = average(state.recovery.map((day) => day.sleep)).toFixed(1)
  const hrvAvg = Math.round(average(state.recovery.map((day) => day.hrv)))
  const restingHrAvg = Math.round(average(state.recovery.map((day) => day.restingHr)))
  const targetLoad = state.profile.weeklyHours * 44
  const hardLoad = state.workouts
    .filter((workout) => workout.intensity === 'Tempo' || workout.intensity === 'Threshold')
    .reduce((total, workout) => total + workout.load, 0)
  const hardLoadShare = Math.round((hardLoad / Math.max(weeklyLoad, 1)) * 100)
  const sleepDebt = Math.max(0, Math.round((7.5 - Number(sleepAvg)) * 18))
  const recoveryVolatility = Math.round(
    Math.max(...state.recovery.map((day) => day.readiness)) - Math.min(...state.recovery.map((day) => day.readiness)),
  )
  const risk = Math.min(92, Math.max(8, Math.round(hardLoadShare * 0.55 + sleepDebt * 0.5 + recoveryVolatility * 0.45)))
  const riskLabel = risk > 55 ? 'watch closely' : risk > 32 ? 'moderate' : 'low'
  const streak = completed.length
  const raceScore = Math.min(98, Math.round(58 + streak * 4 + readiness / 4))
  const daysToRace = Math.max(
    0,
    Math.ceil((new Date(`${state.profile.raceDate}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000),
  )

  return {
    weeklyLoad,
    readiness,
    sleepAvg,
    hrvAvg,
    restingHrAvg,
    targetLoad,
    hardLoadShare,
    sleepDebt,
    recoveryVolatility,
    risk,
    riskLabel,
    streak,
    raceScore,
    daysToRace,
  }
}

function buildChartData(workouts: Workout[]) {
  return workouts.map((workout) => ({
    date: workout.date,
    label: new Date(`${workout.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
    title: workout.title,
    load: workout.load,
    intensity: workout.intensity,
  }))
}

function buildInsights(state: TrainingState, metrics: ReturnType<typeof getMetrics>) {
  const ferritin = state.bloodMarkers.find((marker) => marker.name === 'Ferritin')
  const thresholdDay = state.workouts.find((workout) => workout.intensity === 'Threshold' && workout.status === 'Planned')
  return [
    {
      tone: 'green' as Tone,
      title: 'Load is productive',
      body: `Weekly load is ${metrics.weeklyLoad} against a target of ${metrics.targetLoad}. Hold this range before adding more volume.`,
    },
    {
      tone: 'orange' as Tone,
      title: 'Risk is watchable',
      body: `${metrics.risk}% risk is driven by hard-load share and recovery volatility. The next risky session is ${thresholdDay?.title ?? 'not scheduled'}.`,
    },
    {
      tone: 'blue' as Tone,
      title: 'Fueling quality is improving',
      body: 'Long sessions now include carb notes, so the next version can compare fueling against RPE and fatigue.',
    },
    {
      tone: 'pink' as Tone,
      title: 'Blood marker follow-up',
      body: ferritin ? `${ferritin.name} is ${ferritin.value} ${ferritin.unit}. Keep iron-rich meals visible during this build.` : 'No blood marker data yet.',
    },
  ]
}

function getCoachNote(metrics: ReturnType<typeof getMetrics>) {
  if (metrics.risk > 55) {
    return {
      title: 'Good fitness, but today needs restraint.',
      body: 'Hard-load concentration is high and recovery has been volatile. Keep training moving, but avoid stacking another intense day.',
    }
  }
  if (metrics.readiness > 82) {
    return {
      title: 'Green light, with one clean boundary.',
      body: 'Readiness is strong and sleep is stable. Complete the planned session, but stop at the prescribed duration.',
    }
  }
  return {
    title: 'Keep momentum, lower the intensity.',
    body: 'The plan protects consistency by downshifting intensity when recovery signals soften.',
  }
}

function calculateReadiness(day: Pick<RecoveryDay, 'hrv' | 'sleep' | 'soreness' | 'restingHr'>) {
  const score = 58 + (day.hrv - 58) * 0.9 + (day.sleep - 6.5) * 7 - day.soreness * 3 - Math.max(0, day.restingHr - 52) * 1.2
  return Math.round(Math.min(98, Math.max(35, score)))
}

function loadMultiplier(intensity: Intensity) {
  if (intensity === 'Recovery') return 0.45
  if (intensity === 'Aerobic') return 0.85
  if (intensity === 'Tempo') return 1.25
  return 1.45
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default App
