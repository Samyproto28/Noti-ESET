'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Acceso no Autorizado
          </h1>
          <p className="text-gray-600">
            No tienes permiso para acceder a esta página.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Volver al Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              Ir al Inicio
            </Link>
          </Button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            Si crees que esto es un error, por favor contacta con el administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}