import React, { useEffect, useMemo, useState } from 'react'
import {
  AppBar,
  Box,
  Button,
  Container,
  TextField,
  Toolbar,
  Typography,
  Paper,
  Stack,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function useLocalUserId() {
  const [userId, setUserId] = useState('')
  useEffect(() => {
    let existing = localStorage.getItem('userId')
    if (!existing) {
      existing = `user_${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('userId', existing)
    }
    setUserId(existing)
  }, [])
  return userId
}

function SwipeQuiz({ adminMode }) {
  const userId = useLocalUserId()
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('idle')
  const [drag, setDrag] = useState({ active: false, startX: 0, dx: 0 })
  const [showAdmin, setShowAdmin] = useState(false)
  const [answersMap, setAnswersMap] = useState({})
  const current = questions[index]

  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('loading')
      try {
        const qRes = await fetch(`${API_URL}/api/questions`)
        if (!qRes.ok) throw new Error('questions failed')
        const qData = await qRes.json()
        if (!cancelled) setQuestions(qData)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
      // answers are optional for initial render
      try {
        if (!userId) return
        const map = await fetchAnswers(userId)
        if (!cancelled) setAnswersMap(map)
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  async function fetchAnswers(uid) {
    const aRes = await fetch(`${API_URL}/api/answers/${uid}`)
    if (!aRes.ok) return {}
    const aData = await aRes.json()
    const map = {}
    for (const rec of aData || []) map[rec.questionId] = !!rec.answer
    return map
  }

  async function refreshAnswers() {
    if (!userId) return
    try {
      const map = await fetchAnswers(userId)
      setAnswersMap(map)
    } catch {}
  }

  async function submit(answer) {
    if (!current) return
    try {
      await fetch(`${API_URL}/api/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, questionId: current.id, answer })
      })
      setAnswersMap(prev => ({ ...prev, [current.id]: !!answer }))
      await refreshAnswers()
    } finally {
      setIndex(i => i + 1)
      setDrag({ active: false, startX: 0, dx: 0 })
    }
  }

  useEffect(() => {
    // Refresh answers whenever navigating between questions
    refreshAnswers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ active: true, startX: e.clientX, dx: 0 })
  }

  function onPointerMove(e) {
    if (!drag.active) return
    setDrag(prev => ({ ...prev, dx: e.clientX - prev.startX }))
  }

  function onPointerUp() {
    if (!drag.active) return
    const threshold = 80
    const { dx } = drag
    if (Math.abs(dx) > threshold) {
      submit(dx > 0)
    } else {
      // snap back
      setDrag({ active: false, startX: 0, dx: 0 })
    }
  }

  const rotation = Math.max(-15, Math.min(15, drag.dx / 10))
  const transform = `translateX(${drag.dx}px) rotate(${rotation}deg)`
  const transition = drag.active ? 'none' : 'transform 0.2s ease'
  const yesOpacity = Math.max(0, Math.min(1, drag.dx / 100))
  const noOpacity = Math.max(0, Math.min(1, -drag.dx / 100))
  const prevAnswer = current ? answersMap[current.id] : undefined
  const prevBorder = prevAnswer === undefined ? '1px solid rgba(255,255,255,0.12)'
                    : prevAnswer ? '2px solid #2e7d32' : '2px solid #d32f2f'
  const firstUnansweredIndex = React.useMemo(() => {
    if (!questions.length) return -1
    for (let i = 0; i < questions.length; i++) {
      if (answersMap[questions[i].id] === undefined) return i
    }
    return -1
  }, [questions, answersMap])
  const canSkipToUnanswered = prevAnswer !== undefined && firstUnansweredIndex !== -1 && index !== firstUnansweredIndex

  async function addQuestion(prompt, imageUrl) {
    const res = await fetch(`${API_URL}/api/questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageUrl: imageUrl || null })
    })
    if (!res.ok) throw new Error('Failed to add question')
    const created = await res.json()
    setQuestions(qs => [...qs, created])
  }

  async function saveQuestion(q) {
    const res = await fetch(`${API_URL}/api/questions/${q.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: q.prompt, imageUrl: q.imageUrl || null })
    })
    if (!res.ok) throw new Error('Failed to save question')
  }

  async function deleteQuestion(id) {
    const res = await fetch(`${API_URL}/api/questions/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete question')
    setQuestions(qs => qs.filter(q => q.id !== id))
    if (index >= questions.length - 1) setIndex(Math.max(0, index - 1))
  }

  return (
    <Box sx={{ userSelect: 'none', touchAction: 'pan-y' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Swipe Quiz</Typography>
        {adminMode && (
          <Button size="small" onClick={() => setShowAdmin(v => !v)}>{showAdmin ? 'Close Admin' : 'Admin'}</Button>
        )}
      </Stack>
      {status === 'loading' && <Typography>Loading questions...</Typography>}
      {status === 'error' && <Typography color="error">Failed to load questions.</Typography>}
      {!showAdmin && status === 'ready' && !current && (
        <Box>
          <Typography sx={{ mb: 2 }}>All done! Thanks for answering.</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="text"
              disabled={index === 0}
              onClick={() => { setIndex(i => Math.max(0, i - 1)); setDrag({ active: false, startX: 0, dx: 0 }) }}
            >
              Back
            </Button>
          </Box>
        </Box>
      )}
      {!showAdmin && current && (
        <Box sx={{ position: 'relative', height: 220 }}>
          <Card
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            sx={{ position: 'absolute', inset: 0, transform, transition, border: prevBorder }}
          >
            {current.imageUrl && (
              <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${current.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }} />
            )}
            <CardContent sx={{ position: 'relative' }}>
              <Typography variant="body1" sx={{ mb: 2 }}>{current.prompt}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary', alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ArrowBackIosNewIcon color={prevAnswer === false ? 'error' : 'inherit'} />
                  <Typography color={prevAnswer === false ? 'error' : 'inherit'}>No</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography color={prevAnswer === true ? 'success' : 'inherit'}>Yes</Typography>
                  <ArrowForwardIosIcon color={prevAnswer === true ? 'success' : 'inherit'} />
                </Stack>
              </Box>
            </CardContent>
            {prevAnswer !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  right: 12,
                  bottom: 12,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: prevAnswer ? 'success.main' : 'error.main',
                  color: 'common.white',
                  zIndex: 1
                }}
              >
                Previously answered: {prevAnswer ? 'Yes' : 'No'}
              </Typography>
            )}
          </Card>
          <Typography
            sx={{
              position: 'absolute',
              left: 12,
              top: 8,
              color: 'error.main',
              opacity: noOpacity,
              fontSize: { xs: 28, sm: 36 },
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              textShadow: '0 2px 6px rgba(0,0,0,0.6)',
              zIndex: 1
            }}
            style={{ transform: `scale(${1 + noOpacity * 0.25})` }}
          >
            No
          </Typography>
          <Typography
            sx={{
              position: 'absolute',
              right: 12,
              top: 8,
              color: 'success.main',
              opacity: yesOpacity,
              fontSize: { xs: 28, sm: 36 },
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              textShadow: '0 2px 6px rgba(0,0,0,0.6)',
              zIndex: 1
            }}
            style={{ transform: `scale(${1 + yesOpacity * 0.25})` }}
          >
            Yes
          </Typography>
          <Box sx={{ position: 'absolute', bottom: -56, left: 0, right: 0, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="text"
              disabled={index === 0}
              onClick={() => { setIndex(i => Math.max(0, i - 1)); setDrag({ active: false, startX: 0, dx: 0 }) }}
            >
              Back
            </Button>
            <Button
              variant="text"
              onClick={() => { setIndex(i => i + 1); setDrag({ active: false, startX: 0, dx: 0 }) }}
            >
              Skip
            </Button>
          </Box>
        </Box>
      )}
      {!showAdmin && canSkipToUnanswered && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 7 }}>
          <Button
            variant="outlined"
            onClick={() => { setIndex(firstUnansweredIndex); setDrag({ active: false, startX: 0, dx: 0 }) }}
          >
            Skip to unanswered question
          </Button>
        </Box>
      )}
      {showAdmin && (
        <Paper elevation={1} sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Manage Questions</Typography>
            {questions.map((q, idx) => (
              <Stack key={q.id} spacing={1} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}>
                <TextField fullWidth label={`Q${idx + 1} Prompt`} value={q.prompt}
                  onChange={e => setQuestions(list => list.map(it => it.id === q.id ? { ...it, prompt: e.target.value } : it))} />
                <TextField fullWidth label="Image URL (optional)" value={q.imageUrl || ''}
                  onChange={e => setQuestions(list => list.map(it => it.id === q.id ? { ...it, imageUrl: e.target.value } : it))} />
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" onClick={() => saveQuestion(q)}>Save</Button>
                  <Button size="small" color="error" onClick={() => deleteQuestion(q.id)}>Delete</Button>
                </Stack>
              </Stack>
            ))}
            <AddQuestionForm onAdd={addQuestion} />
          </Stack>
        </Paper>
      )}
    </Box>
  )
}

function AddQuestionForm({ onAdd }) {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const canAdd = prompt.trim().length > 0
  return (
    <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }}>
      <TextField fullWidth label="New question prompt" value={prompt} onChange={e => setPrompt(e.target.value)} />
      <TextField fullWidth label="Image URL (optional)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
      <Button variant="outlined" disabled={!canAdd} onClick={async () => {
        await onAdd(prompt.trim(), imageUrl.trim() || null)
        setPrompt(''); setImageUrl('')
      }}>Add</Button>
    </Stack>
  )
}

export default function App() {
  const [tab, setTab] = useState(0)
  const [areaRefresh, setAreaRefresh] = useState(0)
  const [adminClicks, setAdminClicks] = useState(0)
  const [adminMode, setAdminMode] = useState(false)

  function UserDetails() {
    const userId = useLocalUserId()
    const [form, setForm] = useState({ name: '', email: '', address: '', dateOfBirth: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    useEffect(() => {
      let mounted = true
      async function load() {
        if (!userId) return
        try {
          setLoading(true)
          const res = await fetch(`${API_URL}/api/users/${userId}`)
          if (!res.ok) throw new Error('load failed')
          const data = await res.json()
          if (!mounted) return
          setForm({
            name: data?.name || '',
            email: data?.email || '',
            address: data?.address || '',
            dateOfBirth: data?.dateOfBirth || ''
          })
          setError('')
        } catch (e) {
          if (mounted) setError('Failed to load user details')
        } finally {
          if (mounted) setLoading(false)
        }
      }
      load()
      return () => { mounted = false }
    }, [userId])

    const canSave = useMemo(() => true, [form])

    async function onSave(e) {
      e.preventDefault()
      if (!canSave) return
      try {
        setSaving(true)
        setSaved(false)
        setError('')
        const res = await fetch(`${API_URL}/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            name: form.name.trim() || null,
            email: form.email.trim() || null,
            address: form.address.trim() || null,
            dateOfBirth: form.dateOfBirth || null,
          })
        })
        if (!res.ok) throw new Error('Save failed')
        setSaved(true)
      } catch (e) {
        setError('Failed to save user details')
      } finally {
        setSaving(false)
      }
    }

    if (loading) return <Typography>Loading your details...</Typography>

    return (
      <Paper elevation={1} sx={{ p: 2 }}>
        <form onSubmit={onSave}>
          <Stack spacing={2}>
            <Typography variant="h6">Your Details</Typography>
            <TextField label="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <TextField type="email" label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <TextField label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <TextField type="date" label="Date of birth" InputLabelProps={{ shrink: true }} value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={saving || !canSave}>{saving ? 'Saving...' : 'Save'}</Button>
              {saved && <Typography color="success.main">Saved</Typography>}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Button
                color="error"
                variant="outlined"
                onClick={async () => {
                  if (!confirm('Delete all your quiz answers? This cannot be undone.')) return
                  try {
                    await fetch(`${API_URL}/api/answers/${userId}`, { method: 'DELETE' })
                    // No need to reload page; quiz will refetch when visited
                  } catch {}
                }}
              >
                Delete all quiz answers
              </Button>
              <Typography variant="caption" color="text.secondary">Removes all your previously submitted answers.</Typography>
            </Stack>
            {error && <Typography color="error">{error}</Typography>}
          </Stack>
        </form>
      </Paper>
    )
  }

  function YourArea({ refreshKey }) {
    const userId = useLocalUserId()
    const [stats, setStats] = useState([])
    const [answers, setAnswers] = useState({})
    const [images, setImages] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
      let mounted = true
      async function load() {
        try {
          setLoading(true)
          const [sRes, aRes, qRes] = await Promise.all([
            fetch(`${API_URL}/api/stats/answers`),
            fetch(`${API_URL}/api/answers/${userId}`),
            fetch(`${API_URL}/api/questions`)
          ])
          if (!sRes.ok) throw new Error('stats')
          const [sData, aData, qData] = await Promise.all([
            sRes.json(),
            aRes.ok ? aRes.json() : Promise.resolve([]),
            qRes.ok ? qRes.json() : Promise.resolve([])
          ])
          if (!mounted) return
          const map = {}
          for (const r of aData) map[r.questionId] = !!r.answer
          const imgMap = {}
          for (const q of qData) imgMap[q.id] = q.imageUrl || null
          setStats(sData)
          setAnswers(map)
          setImages(imgMap)
          setError('')
        } catch (e) {
          if (mounted) setError('Failed to load area stats')
        } finally {
          if (mounted) setLoading(false)
        }
      }
      if (userId) load()
      return () => { mounted = false }
    }, [userId, refreshKey])

    if (loading) return <Typography>Loading area stats...</Typography>
    if (error) return <Typography color="error">{error}</Typography>

    return (
      <Stack spacing={2}>
        {stats.map(s => {
          const userAns = answers[s.questionId]
          return (
            <Paper key={s.questionId} elevation={1} sx={{ p: 2, position: 'relative', overflow: 'hidden' }}>
              {images[s.questionId] && (
                <Box sx={{ position: 'absolute', inset: 0, backgroundImage: `url(${images[s.questionId]})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.25 }} />
              )}
              <Typography variant="subtitle1" sx={{ mb: 1, position: 'relative' }}>{s.prompt}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" sx={{ mb: 1, position: 'relative' }}>
                <Typography>Your answer: {userAns === undefined ? '—' : (userAns ? 'Yes' : 'No')}</Typography>
                <Typography>Area: {s.percentTrue}% Yes ({s.trueCount}/{s.total})</Typography>
              </Stack>
              <Box sx={{ position: 'relative', height: 16, bgcolor: 'error.main', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${s.percentTrue}%`, bgcolor: 'success.main' }} />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', px: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.primary' }}>{s.percentTrue}% Yes</Typography>
                </Box>
              </Box>
            </Paper>
          )
        })}
      </Stack>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            onClick={() => {
              setAdminClicks(c => {
                const next = c + 1
                if (next >= 7) { setAdminMode(true) }
                return next
              })
            }}
            sx={{ cursor: 'default' }}
          >
            Local Vibez
          </Typography>
          {adminMode && (
            <Typography sx={{ ml: 2 }} variant="caption">Admin mode</Typography>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Paper elevation={1} sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); if (v === 2) setAreaRefresh(c => c + 1) }} variant="fullWidth">
            <Tab label="Your Details" />
            <Tab label="Quiz" />
            <Tab label="Your Area" />
          </Tabs>
        </Paper>

        {tab === 0 && (
          <UserDetails />
        )}

        {tab === 1 && (
          <SwipeQuiz adminMode={adminMode} />)
        }

        {tab === 2 && (
          <YourArea refreshKey={areaRefresh} />)
        }
      </Container>
    </Box>
  )
}


