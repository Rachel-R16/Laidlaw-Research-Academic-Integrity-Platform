import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const DocumentsList: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const handleNewDoc = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) return

    console.log('Creating new doc for user:', session.user.id)
    const { data, error } = await supabase
      .from('documents')
      .insert([{ owner_id: session.user.id, title: 'Untitled Document' }])
      .select('id')
      .single()
    console.log('Insert data:', data, 'Error:', error)


    if (error) {
      console.error('Error creating new doc:', error)
      return
    }

    navigate(`/documents/${data.id}`)
  }

  useEffect(() => {
    const fetchDocs = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, created_at')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching documents:', error)
      } else {
        setDocuments(data || [])
      }

      setLoading(false)
    }

    fetchDocs()
  }, [])

  if (loading) return <p>Loading documents...</p>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Your Documents</h2>
      <button
        onClick={handleNewDoc}
        className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700"
      >
        + New Document
      </button>

      {documents.length === 0 ? (
        <p className="text-gray-600">No documents yet.</p>
      ) : (
        <ul className="space-y-3">
          {documents.map(doc => (
            <li key={doc.id}>
              <Link
                to={`/documents/${doc.id}`}
                className="block p-4 bg-white rounded-lg shadow hover:bg-gray-50 transition"
              >
                <p className="font-medium">{doc.title || 'Untitled'}</p>
                <p className="text-sm text-gray-500">{new Date(doc.created_at).toLocaleString()}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default DocumentsList
