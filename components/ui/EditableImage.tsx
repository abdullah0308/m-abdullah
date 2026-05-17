'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { useSiteContent } from '@/context/SiteContext'
import { getPath } from '@/lib/contentUtils'

interface Props {
  path: string
  alt: string
  fill?: boolean
  className?: string
  sizes?: string
  quality?: number
  style?: React.CSSProperties
  priority?: boolean
}

export default function EditableImage({
  path,
  alt,
  fill,
  className,
  sizes,
  quality,
  style,
  priority,
}: Props) {
  const { content, isEditing, updateContent } = useSiteContent()
  const src = String(getPath(content as unknown as Record<string, unknown>, path) ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', alt)

    const res = await fetch('/payload-api/media', {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      const url: string = data.doc?.url ?? data.url ?? ''
      if (url) updateContent(path, url)
    }
  }

  if (!isEditing) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        className={className}
        sizes={sizes}
        quality={quality}
        style={style}
        priority={priority}
      />
    )
  }

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill={fill}
        className={className}
        sizes={sizes}
        quality={quality}
        style={style}
        priority={priority}
      />
      <button
        type="button"
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20 bg-black/50 cursor-pointer"
        onClick={() => inputRef.current?.click()}
        title="Click to change image"
      >
        <span className="bg-gold text-black font-mono text-xs tracking-widest uppercase px-4 py-2 pointer-events-none">
          Change Image
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
        }}
      />
    </>
  )
}
