import React from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const App = () => {
  const [log, setLog] = React.useState<any[]>([])
  const [prevText, setPrevText] = React.useState('')

  const sessionId = React.useMemo(() => crypto.randomUUID(), [])
  const pendingLogs = React.useRef<any[]>([])

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (pendingLogs.current.length === 0) return

      fetch('http://localhost:4000/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          logs: pendingLogs.current,
        }),
      }).catch(err => {
        console.error('Failed to send logs:', err)
      })

      pendingLogs.current = []
    }, 5000)

    return () => clearInterval(interval)
  }, [sessionId])

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Hello world!</p>',
    onUpdate: ({ editor }) => {
      const newText = editor.getText()
      const timestamp = new Date().toISOString()

      const delta = newText.length - prevText.length

      const entry = {
        type: 'delta',
        delta,
        prevLength: prevText.length,
        newLength: newText.length,
        timestamp,
      }

      setLog(prev => [...prev, entry])
      pendingLogs.current.push(entry)

      setPrevText(newText)
    },

    editorProps: {
      handleDOMEvents: {
        keydown: (_view, event) => {
          const key = event.key
          const timestamp = new Date().toISOString()

          const entry = {
            type: 'keydown',
            key,
            timestamp,
          }

          setLog(prev => [...prev, entry])
          pendingLogs.current.push(entry)

          return false
        },
        paste: (_view, event) => {
          const pastedText = event.clipboardData?.getData('text')
          const timestamp = new Date().toISOString()

          const entry = {
            type: 'paste',
            content: pastedText,
            timestamp,
          }

          setLog(prev => [...prev, entry])
          pendingLogs.current.push(entry)

          return false
        },
      },
    },
  })

  return (
    <div style={{ padding: '2rem' }}>
      <h1>📝 TipTap Editor</h1>
      <EditorContent editor={editor} />
      <pre style={{ marginTop: '2rem', backgroundColor: '#f5f5f5', padding: '1rem' }}>
        {JSON.stringify(log, null, 2)}
      </pre>
    </div>
  )
}

export default App
