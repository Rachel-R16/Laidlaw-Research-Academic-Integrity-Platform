import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch()

const KeystrokeTrackerEditor = () => {
  const prevText = useRef('')
  const lastKey = useRef('')
  const [logs, setLogs] = useState([])

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      const newText = editor.getText()
      const diffs = dmp.diff_main(prevText.current, newText)
      dmp.diff_cleanupSemantic(diffs)

      const key = lastKey.current
      let added = ''
      let deleted = ''

      for (const [op, data] of diffs) {
        if (op === 1) added += data
        else if (op === -1) deleted += data
      }

      let logMessage = ''

      if (added) {
        logMessage = `key pressed: ${key}, change in doc: '${added}' added`
      } else if (deleted) {
        logMessage = `key pressed: ${key}, change in doc: '${deleted}' deleted`
      } else {
        logMessage = `key pressed: ${key}, no change`
      }

      console.log(logMessage)
      setLogs((prev) => [logMessage, ...prev.slice(0, 20)]) // show last 20 logs only
      prevText.current = newText
    },
  })

useEffect(() => {
  const handleClick = (e) => {
    const key = 'mouse click'
    const oldText = prevText.current

    setTimeout(() => {
      const newText = editor?.getText() || ''
      if (newText === oldText) {
        const logMessage = `${key}, no change`
        console.log(logMessage)
        setLogs((prev) => [logMessage, ...prev.slice(0, 20)])
        return
      }

      const diffs = dmp.diff_main(oldText, newText)
      dmp.diff_cleanupSemantic(diffs)

      let added = ''
      let deleted = ''

      for (const [op, data] of diffs) {
        if (op === 1) added += data
        else if (op === -1) deleted += data
      }

      let logMessage = ''

      if (added) {
        logMessage = `${key}, change in doc: '${added}' added`
      } else if (deleted) {
        logMessage = `${key}, change in doc: '${deleted}' deleted`
      } else {
        logMessage = `${key}, no change`
      }

      console.log(logMessage)
      setLogs((prev) => [logMessage, ...prev.slice(0, 20)])
      prevText.current = newText
    }, 0)
  }

  window.addEventListener('click', handleClick)
  return () => window.removeEventListener('click', handleClick)
}, [editor])


  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Keystroke Tracker Editor</h2>
      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '12px',
          minHeight: '200px',
          marginBottom: '20px',
        }}
      >
        {editor && <EditorContent editor={editor} />}
      </div>


      <h3>Live Logs</h3>
      <div
        style={{
          background: '#f9f9f9',
          padding: '10px',
          borderRadius: '8px',
          height: '200px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  )
}

export default KeystrokeTrackerEditor
