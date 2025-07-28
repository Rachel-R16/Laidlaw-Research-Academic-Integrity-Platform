// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Signup from './components/Signup'
import Login from './components/Login'
import ConfirmEmail from './components/ConfirmEmail'
import DocumentList from './components/DocumentList'
import DocumentEditor from './components/DocumentEditor'

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/confirm" element={<ConfirmEmail />} />
        <Route path="/documents" element={<DocumentList />} />
        <Route
          path="/documents/:id"
          element={
            <div className="p-8 space-y-8">
              <h1 className="text-3xl font-bold">📝 Editor</h1>
              <DocumentEditor /> {}
            </div>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
