// backend/index.js
const express = require('express')
const cors = require('cors')
const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json())

// store logs in memory (for now)
const sessions = {}

app.post('/log', (req, res) => {
  const { sessionId, logs } = req.body

  if (!sessions[sessionId]) sessions[sessionId] = []
  sessions[sessionId].push(...logs)

  console.log(`[LOG] Session ${sessionId}: ${logs.length} new events`)
  res.sendStatus(200)
})

app.get('/session/:id', (req, res) => {
  const id = req.params.id
  res.json(sessions[id] || [])
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
