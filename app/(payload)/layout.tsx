import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import '@payloadcms/next/css'
import React from 'react'
import { importMap } from './payload/importMap.js'

type Args = {
  children: React.ReactNode
}

const serverFunction = async function (args: Parameters<typeof handleServerFunctions>[0]) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

const Layout = ({ children }: Args) =>
  RootLayout({ config, children, importMap, serverFunction })

export default Layout
