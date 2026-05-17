import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import '@payloadcms/next/css'
import React from 'react'
import { type ServerFunctionClient } from 'payload'
import { importMap } from './payload/importMap.js'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

const Layout = ({ children }: Args) =>
  RootLayout({ config, children, importMap, serverFunction })

export default Layout
