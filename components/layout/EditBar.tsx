'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSiteContent } from '@/context/SiteContext'

export default function EditBar() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const { saveStatus } = useSiteContent()

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/payload-api/users/logout', { method: 'POST' })
    } finally {
      router.push('/')
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-11 bg-gold flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-black/50 animate-pulse" />
        <span className="font-mono text-xs font-bold tracking-[0.25em] uppercase text-black">
          Edit Mode
        </span>
        <span className="font-mono text-xs tracking-widest transition-opacity duration-300">
          {saveStatus === 'saving' && <span className="text-black/50">· Saving…</span>}
          {saveStatus === 'saved' && <span className="text-black/70">· Saved ✓</span>}
          {saveStatus === 'error' && <span className="text-red-700">· Save failed — check console</span>}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-black/40 hidden sm:block">
          Click any text to edit · changes save automatically
        </span>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="font-mono text-xs tracking-widest uppercase text-black/60 hover:text-black transition-colors disabled:opacity-40"
        >
          {loggingOut ? 'Logging out…' : 'Log Out'}
        </button>
      </div>
    </div>
  )
}
