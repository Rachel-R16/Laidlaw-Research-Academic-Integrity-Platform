// src/components/DocumentEditor.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { supabase } from '../supabaseClient'
import Underline from '@tiptap/extension-underline'

const detectSuspicion = (logs: any[]) => {
  const deletedChunks: string[] = []
  let suspicious = false
  for (const log of logs) {
    const { delta, meta } = log
    if (delta < 0 && meta?.type === 'keydown' && meta.key === 'Backspace') {
      if (log.content) deletedChunks.push(log.content)
    }
    if (meta?.type === 'paste') {
      const pasted = meta.content?.trim()
      const matched = deletedChunks.some(chunk => chunk && pasted?.includes(chunk))
      if (!matched && pasted?.length > 0) suspicious = true
    }
  }
  return suspicious
}

const DocumentEditor: React.FC = () => {
  const { id: documentId } = useParams()
  const [log, setLog] = useState<any[]>([])
  const [prevText, setPrevText] = useState('')
  const pendingLogs = useRef<any[]>([])
  const [token, setToken] = useState<string | null>(null)
  const lastEvent = useRef<any | null>(null)
  const [editorReady, setEditorReady] = useState(false)
  const editorRef = useRef<any>(null)

  const [unsavedContent, setUnsavedContent] = useState(false)
  const [unsavedLogs, setUnsavedLogs] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: '',
    onUpdate: ({ editor }) => {
      const newText = editor.getText()
      const delta = newText.length - prevText.length
      const timestamp = new Date().toISOString()

      const entry: any = {
        type: 'delta',
        delta,
        prevLength: prevText.length,
        newLength: newText.length,
        timestamp,
      }

      if (lastEvent.current) {
        entry.meta = lastEvent.current
        if (lastEvent.current.type === 'keydown' && lastEvent.current.key === 'Backspace') {
          entry.content = prevText.slice(-Math.abs(delta))
        }
        lastEvent.current = null
      }

      setLog(prev => [...prev, entry])
      pendingLogs.current.push(entry)
      setPrevText(newText)

      setUnsavedLogs(true)  // mark logs as unsaved
    },
    editorProps: {
      handleDOMEvents: {
        keydown: (_view, event) => {
          lastEvent.current = {
            type: 'keydown',
            key: event.key,
            timestamp: new Date().toISOString(),
          }
          return false
        },
        paste: (_view, event) => {
          lastEvent.current = {
            type: 'paste',
            content: event.clipboardData?.getData('text'),
            timestamp: new Date().toISOString(),
          }
          return false
        },
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor
      setEditorReady(true)
    },
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null)
    })
  }, [])

  useEffect(() => {
    if (!documentId || !editorReady || !editorRef.current) return

    const loadContent = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('content')
        .eq('id', documentId)
        .single()

      if (error) {
        console.error('Error loading content:', error)
        return
      }

      const content = data?.content || ''
      editorRef.current.commands.setContent(content)
      setPrevText(editorRef.current.getText())
      setUnsavedContent(false)
      setUnsavedLogs(false)
    }

    loadContent()
  }, [documentId, editorReady])

  const saveLogs = async (docId: string, logs: any[]) => {
    if (!docId || logs.length === 0) return

    const suspicious = detectSuspicion(logs)

    const sessionPayload = {
      document_id: docId,
      suspicious,
      logdata: logs,
      timestamp: new Date().toISOString(),
    }

    const url = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/logs`

    if (navigator.sendBeacon && token) {
      const blob = new Blob([JSON.stringify([sessionPayload])], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
    } else {
      const { error } = await supabase.from('logs').insert([sessionPayload])
      if (error) console.error('Error saving logs:', error)
    }

    setUnsavedLogs(false)
  }

  const saveContent = async () => {
    if (!documentId || !editorRef.current) return

    const html = editorRef.current.getHTML()
    const { error } = await supabase
      .from('documents')
      .update({ content: html })
      .eq('id', documentId)

    if (error) {
      console.error('Error saving content:', error)
    } else {
      setUnsavedContent(false)
    }
  }

  // Auto-flush logs every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!documentId || pendingLogs.current.length === 0) return
      saveLogs(documentId, pendingLogs.current)
      pendingLogs.current = []
    }, 5000)

    return () => clearInterval(interval)
  }, [documentId, token])

  // Warn user on unsaved data if trying to close tab or browser
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedContent || unsavedLogs) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [unsavedContent, unsavedLogs])

  // Save on page unload (best effort)
  useEffect(() => {
    const handleUnload = () => {
      if (!documentId) return
      saveContent()
      if (pendingLogs.current.length > 0) {
        saveLogs(documentId, pendingLogs.current)
        pendingLogs.current = []
      }
    }

    window.addEventListener('unload', handleUnload)
    return () => window.removeEventListener('unload', handleUnload)
  }, [documentId, token])

  const navigate = useNavigate()

  // Save button handler
  const handleSaveClick = async () => {
    await saveContent()
    if (pendingLogs.current.length > 0) {
      await saveLogs(documentId!, pendingLogs.current)
      pendingLogs.current = []
    }
  }

  // Back button handler, also saves before navigating
  const handleBack = async () => {
    await handleSaveClick()
    navigate('/documents')
  }

  if (!documentId) return <div>Invalid document ID</div>

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-700 hover:text-black transition"
          aria-label="Back to documents"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to documents
        </button>

        <button
          onClick={handleSaveClick}
          className={`px-4 py-2 rounded transition ${
            unsavedContent || unsavedLogs
              ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!unsavedContent && !unsavedLogs}
        >
          Save
        </button>
      </div>

      <div className="mb-2 flex space-x-2 border-b border-gray-300 pb-2">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded ${
            editor?.isActive('bold') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'
          }`}
          aria-label="Toggle Bold"
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded italic ${
            editor?.isActive('italic') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'
          }`}
          aria-label="Toggle Italic"
          type="button"
        >
          I
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`px-2 py-1 rounded ${
            editor?.isActive('underline') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'
          }`}
          aria-label="Toggle Underline"
          type="button"
        >
          U
        </button>
      </div>

      
      <div className="border border-gray-300 rounded-md p-4 min-h-[300px] shadow-sm bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default DocumentEditor
