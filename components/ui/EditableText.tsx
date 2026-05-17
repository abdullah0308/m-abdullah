'use client'

import { useEffect, useRef } from 'react'
import { useSiteContent } from '@/context/SiteContext'
import { getPath } from '@/lib/contentUtils'

interface Props {
  path: string
  className?: string
  tag?: string
}

export default function EditableText({ path, className = '', tag = 'span' }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = tag as any
  const { content, isEditing, updateContent } = useSiteContent()
  const value = String(getPath(content as unknown as Record<string, unknown>, path) ?? '')
  const ref = useRef<HTMLElement>(null)
  const lastSavedRef = useRef(value)

  // Sync DOM when content changes externally (not while user is typing)
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.textContent = value
      lastSavedRef.current = value
    }
  }, [value])

  if (!isEditing) {
    return <Tag className={className}>{value}</Tag>
  }

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`${className} cursor-text outline-none ring-1 ring-inset ring-gold/50 rounded-[1px] transition-shadow focus:ring-2 focus:ring-gold`}
      onFocus={() => {
        lastSavedRef.current = ref.current?.textContent ?? ''
      }}
      onBlur={() => {
        const newVal = ref.current?.textContent ?? ''
        if (newVal !== lastSavedRef.current) {
          lastSavedRef.current = newVal
          updateContent(path, newVal)
        }
      }}
    >
      {value}
    </Tag>
  )
}
