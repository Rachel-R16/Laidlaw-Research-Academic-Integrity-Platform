// src/pages/ConfirmEmail.tsx
import React from 'react'
import { Link } from 'react-router-dom'

const ConfirmEmail: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md space-y-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-800">Confirm your email</h2>
        <p className="text-gray-600">
          We’ve sent a confirmation link to your email. Click it to verify your account and continue.
        </p>
        <p className="text-sm text-gray-500">
          Once confirmed, you can <Link to="/login" className="text-blue-600 hover:underline">log in</Link>.
        </p>
      </div>
    </div>
  )
}

export default ConfirmEmail
