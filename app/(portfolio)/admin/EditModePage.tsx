'use client'

import { EditProvider } from '@/context/SiteContext'
import EditBar from '@/components/layout/EditBar'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Process from '@/components/sections/Process'
import Work from '@/components/sections/Work'
import Archery from '@/components/sections/Archery'
import Contact from '@/components/sections/Contact'
import type { ContentData } from '@/lib/defaultContent'

export default function EditModePage({ initialContent }: { initialContent: ContentData }) {
  return (
    <EditProvider initialContent={initialContent}>
      <EditBar />
      <div className="pt-11">
        <Hero />
        <About />
        <Process />
        <Work />
        <Archery />
        <Contact />
      </div>
    </EditProvider>
  )
}
