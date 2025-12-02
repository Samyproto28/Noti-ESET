'use client';

import { useState } from 'react';
import { RoleManagementDashboard } from '@/components/admin/RoleManagementDashboard';
import { SystemAdminDashboard } from '@/components/admin/SystemAdminDashboard';

export default function AdminPage() {
  const [activeModule, setActiveModule] = useState<'roles' | 'system'>('roles');

  return (
    <div className=\"min-h-screen bg-gray-50\">
      <div className=\"max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8\">
        {/* Encabezado */}
        <div className=\"mb-8\">
          <h1 className=\"text-3xl font-bold text-gray-900\">Panel de Administración</h1>
          <p className=\"text-gray-600 mt-2\">
            Gestión completa del sistema, usuarios, roles y seguridad
          </p>
        </div>

        {/* Navegación */}
        <div className=\"flex space-x-1 mb-6\">
          <button
            onClick={() => setActiveModule('roles')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeModule === 'roles'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Gestión de Roles
          </button>
          <button
            onClick={() => setActiveModule('system')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeModule === 'system'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Sistema
          </button>
        </div>

        {/* Contenido del módulo activo */}
        {activeModule === 'roles' && <RoleManagementDashboard />}
        {activeModule === 'system' && <SystemAdminDashboard />}
      </div>
    </div>
  );
}