'use client'

import { useState, FormEvent } from 'react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/payload-api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (res.ok) {
      window.location.href = '/admin'
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.errors?.[0]?.message || data.message || 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-charcoal-deep flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-gold" />
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-gold">Edit Mode</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Sign in</h1>
          <p className="text-white/40 text-sm mt-2 font-mono">to edit your portfolio content</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-mono text-xs tracking-widest uppercase text-white/40 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-gold/60 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block font-mono text-xs tracking-widest uppercase text-white/40 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-gold/60 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-mono text-xs text-red-400 tracking-wide">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-black font-mono text-xs tracking-[0.25em] uppercase py-4 hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 font-mono text-xs text-white/20 text-center">
          First time?{' '}
          <a href="/payload" className="text-white/40 underline hover:text-white/60 transition-colors">
            Create your account at /payload
          </a>
        </p>
      </div>
    </div>
  )
}
