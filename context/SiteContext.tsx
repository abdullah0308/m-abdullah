'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { defaultContent, ContentData } from '@/lib/defaultContent'
import { setPath } from '@/lib/contentUtils'

interface SiteContextValue {
  content: ContentData
  isEditing: boolean
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  updateContent: (path: string, value: string) => Promise<void>
}

const SiteContext = createContext<SiteContextValue>({
  content: defaultContent,
  isEditing: false,
  saveStatus: 'idle',
  updateContent: async () => {},
})

export function useSiteContent() {
  return useContext(SiteContext)
}

export function SiteProvider({
  children,
  initialContent,
}: {
  children: React.ReactNode
  initialContent?: ContentData
}) {
  return (
    <SiteContext.Provider
      value={{
        content: initialContent ?? defaultContent,
        isEditing: false,
        saveStatus: 'idle',
        updateContent: async () => {},
      }}
    >
      {children}
    </SiteContext.Provider>
  )
}

export function EditProvider({
  children,
  initialContent,
}: {
  children: React.ReactNode
  initialContent: ContentData
}) {
  const [content, setContent] = useState<ContentData>(initialContent)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateContent = useCallback(async (path: string, value: string) => {
    setContent(
      (prev) =>
        setPath(prev as unknown as Record<string, unknown>, path, value) as unknown as ContentData
    )
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, value }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        console.error('Save failed:', res.status, body?.error ?? '(non-JSON response)')
        setSaveStatus('error')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
        return
      }
    } catch (err) {
      console.error('Save error:', err)
      setSaveStatus('error')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
      return
    }
    setSaveStatus('saved')
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }, [])

  return (
    <SiteContext.Provider value={{ content, isEditing: true, saveStatus, updateContent }}>
      {children}
    </SiteContext.Provider>
  )
}
