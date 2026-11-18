'use client'

import { EditProvider } from '@/context/SiteContext'
import EditBar from '@/components/layout/EditBar'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import MeetFlocon from '@/components/sections/MeetFlocon'
import Process from '@/components/sections/Process'
import Work from '@/components/sections/Work'
import Skills from '@/components/sections/Skills'
import Archery from '@/components/sections/Archery'
import Contact from '@/components/sections/Contact'
import type { ContentData } from '@/lib/defaultContent'

/**
 * Inline editing surface. Renders the same sections as the public page so what
 * you edit is what ships.
 *
 * Theme context comes from Shell in the route-group layout, so the toggle in
 * the header works here too.
 */
export default function EditModePage({ initialContent }: { initialContent: ContentData }) {
  return (
    <EditProvider initialContent={initialContent}>
      <EditBar />
      <div className="pt-11">
        <Hero />
        <About />
        <MeetFlocon />
        <Process />
        <Work />
        <Skills />
        <Archery />
        <Contact />
      </div>
    </EditProvider>
  )
}
