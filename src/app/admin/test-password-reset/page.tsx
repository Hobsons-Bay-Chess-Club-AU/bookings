'use client'

import { useState } from 'react'

export default function TestPasswordResetPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState('')

    const testPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setResult('')

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                setResult(`Error: ${data.error || 'Unknown error'}`)
            } else {
                setResult(`Success: ${data.message}`)
            }
        } catch (err) {
            setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Test Password Reset
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Test the password reset email functionality
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={testPasswordReset}>
                    {result && (
                        <div className={`px-4 py-3 rounded ${
                            result.startsWith('Error') 
                                ? 'bg-red-50 border border-red-200 text-red-600' 
                                : 'bg-green-50 border border-green-200 text-green-600'
                        }`}>
                            {result}
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="email" className="sr-only">
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            placeholder="Email address to test"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Testing...' : 'Test Password Reset'}
                        </button>
                    </div>

                    <div className="text-center">
                        <a
                            href="/auth/login"
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            ← Back to login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    )
} 