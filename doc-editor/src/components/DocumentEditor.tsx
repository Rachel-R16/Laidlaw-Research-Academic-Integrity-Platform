// src/components/DocumentEditor.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { supabase } from '../supabaseClient'

const detectSuspicion = (logs: any[]) => {
  const cutChunks: string[] = []
  const relevantLogs: string[] = []
  let suspiciousLogCount = 0
  let totalLogCount = 0

  for (const log of logs) {
    const { delta, meta } = log
    totalLogCount++

    if (meta?.type === 'keydown' && Math.abs(delta) > 1) {
      suspiciousLogCount++
      relevantLogs.push(log)
    }

    if (meta?.type === 'cut' && meta?.content) {
      cutChunks.push(meta?.content?.trim())
    }

    if (meta?.type === 'paste') {
      const pasted = meta.content?.trim()
      const isKnown = cutChunks.some(chunk => pasted?.includes(chunk))
      if (!isKnown && pasted?.length > 0) {
        suspiciousLogCount++
      }
    }
  }

  return {
    relevantLogs,
    suspiciousLogCount,
    totalLogCount
  }
}

const DocumentEditor: React.FC = () => {
  const { id: documentId } = useParams()
  const [log, setLog] = useState<any[]>([])
  const [prevText, setPrevText] = useState('')
  const [title, setTitle] = useState('')
  const [titleDirty, setTitleDirty] = useState(false)
  const pendingLogs = useRef<any[]>([])
  const [token, setToken] = useState<string | null>(null)
  const lastEvent = useRef<any | null>(null)
  const [editorReady, setEditorReady] = useState(false)
  const editorRef = useRef<any>(null)

  const [unsavedContent, setUnsavedContent] = useState(false)
  const [unsavedLogs, setUnsavedLogs] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      HorizontalRule
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const newText = editor.getText()
      const delta = newText.length - prevText.length
      const timestamp = new Date().toISOString()

      const entry: any = {
        delta,
        timestamp,
      }

      if (lastEvent.current) {
        entry.meta = lastEvent.current
        if (lastEvent.current.type === 'keydown' && lastEvent.current.key === 'Backspace') {
          entry.content = prevText.slice(-Math.abs(delta))
        }
        if (lastEvent.current.type === 'cut') {
          entry.content = prevText.slice(-Math.abs(delta))
        }
        lastEvent.current = null
      }

      setLog(prev => [...prev, entry])
      pendingLogs.current.push(entry)
      setPrevText(newText)

      setUnsavedLogs(true)
      setUnsavedContent(true)
    },
    editorProps: {
      handleDOMEvents: {
        keydown: (_view, event) => {
          lastEvent.current = {
            type: 'keydown',
            key: event.key,
            ctrlKey: event.ctrlKey || event.metaKey,
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
        cut: (_view, event) => {
          lastEvent.current = {
            type: 'cut',
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
        .select('content, title')
        .eq('id', documentId)
        .single()

      if (error) {
        console.error('Error loading content:', error)
        return
      }

      const content = data?.content || ''
      editorRef.current.commands.setContent(content)
      setPrevText(editorRef.current.getText())
      setTitle(data?.title || '')
      setUnsavedContent(false)
      setUnsavedLogs(false)
    }

    loadContent()
  }, [documentId, editorReady])

  const saveLogs = async (docId: string, logs: any[]) => {
    if (!docId || logs.length === 0) return

    const suspicion = detectSuspicion(logs)

    const sessionPayload = {
      document_id: docId,
      logdata: suspicion.relevantLogs,
      suspicious_log_count: suspicion.suspiciousLogCount,
      total_log_count: suspicion.totalLogCount,
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
      .update({ content: html, title })
      .eq('id', documentId)

    if (error) {
      console.error('Error saving content:', error)
    } else {
      setUnsavedContent(false)
      setTitleDirty(false)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (!documentId || pendingLogs.current.length === 0) return
      saveLogs(documentId, pendingLogs.current)
      pendingLogs.current = []
    }, 5000)

    return () => clearInterval(interval)
  }, [documentId, token])

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

  const handleSaveClick = async () => {
    await saveContent()
    if (pendingLogs.current.length > 0) {
      await saveLogs(documentId!, pendingLogs.current)
      pendingLogs.current = []
    }
  }

  const handleBack = async () => {
    await handleSaveClick()
    navigate('/documents')
  }

  if (!documentId) return <div>Invalid document ID</div>

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <button onClick={handleBack} className="text-gray-700 hover:text-black flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to documents
        </button>
        <button
          onClick={handleSaveClick}
          className={`px-4 py-2 rounded ${unsavedContent || unsavedLogs ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          disabled={!unsavedContent && !unsavedLogs}
        >
          Save
        </button>
      </div>

      <input
        type="text"
        className="text-2xl font-bold w-full mb-4 border-b border-gray-300 focus:outline-none focus:border-blue-500"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setTitleDirty(true); setUnsavedContent(true) }}
        onBlur={saveContent}
        placeholder="Document Title"
      />

      <div className="mb-2 flex flex-wrap gap-2 border-b border-gray-300 pb-2">
        <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`px-2 py-1 rounded ${editor?.isActive('bold') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}><strong>B</strong></button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded italic ${editor?.isActive('italic') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>I</button>
        <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`px-2 py-1 rounded ${editor?.isActive('underline') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>U</button>
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded ${editor?.isActive('bulletList') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>Bullets</button>
        <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 rounded ${editor?.isActive('orderedList') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>Numbered</button>
        <button onClick={() => editor?.chain().focus().toggleHighlight().run()} className={`px-2 py-1 rounded ${editor?.isActive('highlight') ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>Highlight</button>
        <button onClick={() => editor?.chain().focus().setHorizontalRule().run()} className="px-2 py-1 rounded hover:bg-gray-200">Divider</button>
        <button onClick={() => editor?.chain().focus().setTextAlign('left').run()} className="px-2 py-1 rounded hover:bg-gray-200">Left</button>
        <button onClick={() => editor?.chain().focus().setTextAlign('center').run()} className="px-2 py-1 rounded hover:bg-gray-200">Center</button>
        <button onClick={() => editor?.chain().focus().setTextAlign('right').run()} className="px-2 py-1 rounded hover:bg-gray-200">Right</button>
      </div>

      <div className="border border-gray-300 rounded-md p-4 min-h-[300px] shadow-sm bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default DocumentEditor
