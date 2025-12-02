'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { roleAssignmentService, type RoleAssignmentResult } from '@/lib/roleAssignment';
import { auditService, type AuditLogEntry, type AuditStatistics } from '@/lib/auditService';
import { SecurityDashboard, type SecurityThreat } from '@/lib/securityMiddleware';
import { AuditLogsDashboard } from './AuditLogsDashboard';
import { RoleAssignmentForm } from './RoleAssignmentForm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const roleManagementSchema = z.object({
  search_user: z.string().optional(),
  filter_role: z.string().optional(),
  filter_status: z.enum(['all', 'with_role', 'without_role']).default('all')
});

type RoleManagementFormData = z.infer<typeof roleManagementSchema>;

interface UserRole {
  id: string;
  email: string;
  full_name: string;
  role_name?: string;
  role_level?: number;
  assigned_at?: string;
  status: 'active' | 'inactive';
}

interface RoleInfo {
  id: string;
  name: string;
  level: number;
  description: string;
  user_count: number;
}

export function RoleManagementDashboard() {
  const { hasPermission, hasRole, user } = usePermissions();
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'audit' | 'security'>('overview');
  const [users, setUsers] = useState<UserRole[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<RoleManagementFormData>({
    resolver: zodResolver(roleManagementSchema),
    defaultValues: {
      filter_status: 'all'
    }
  });

  const watchedSearchUser = watch('search_user');
  const watchedFilterRole = watch('filter_role');
  const watchedFilterStatus = watch('filter_status');

  // Cargar datos iniciales
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (user && !loading) {
      loadUsers();
    }
  }, [watchedSearchUser, watchedFilterRole, watchedFilterStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUsers(), loadRoles(), loadStatistics()]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!user) return;

    try {
      const allUsers = await roleAssignmentService.getUsersWithoutRoles();
      const assignments = await roleAssignmentService.getAllAssignments(1000);

      // Combinar información de usuarios y asignaciones
      const combinedUsers = allUsers.map(user => ({
        ...user,
        role_name: undefined,
        role_level: undefined,
        assigned_at: undefined,
        status: 'active'
      }));

      // Agregar usuarios con roles
      assignments.forEach(assignment => {
        const userIndex = combinedUsers.findIndex(u => u.id === assignment.user_id);
        if (userIndex !== -1) {
          combinedUsers[userIndex] = {
            ...combinedUsers[userIndex],
            role_name: assignment.role_name,
            role_level: assignment.role_level,
            assigned_at: assignment.assigned_at,
            status: 'active'
          };
        }
      });

      let filteredUsers = combinedUsers;

      // Aplicar filtros
      if (watchedSearchUser) {
        const searchLower = watchedSearchUser.toLowerCase();
        filteredUsers = filteredUsers.filter(u =>
          u.email.toLowerCase().includes(searchLower) ||
          u.full_name.toLowerCase().includes(searchLower)
        );
      }

      if (watchedFilterRole) {
        filteredUsers = filteredUsers.filter(u => u.role_name === watchedFilterRole);
      }

      if (watchedFilterStatus === 'with_role') {
        filteredUsers = filteredUsers.filter(u => u.role_name !== undefined);
      } else if (watchedFilterStatus === 'without_role') {
        filteredUsers = filteredUsers.filter(u => u.role_name === undefined);
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const loadRoles = async () => {
    if (!user) return;

    try {
      const availableRoles = await roleAssignmentService.getAvailableRoles(user.id);
      const assignments = await roleAssignmentService.getAllAssignments(1000);

      const roleCounts = assignments.reduce((acc, assignment) => {
        acc[assignment.role_name] = (acc[assignment.role_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const rolesWithCounts = availableRoles.map(role => ({
        ...role,
        user_count: roleCounts[role.name] || 0
      }));

      setRoles(rolesWithCounts);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    }
  };

  const loadStatistics = async () => {
    if (!user) return;

    try {
      const stats = await auditService.getAuditStatistics(user.id);
      setStatistics(stats);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const loadRecentLogs = async () => {
    if (!user) return;

    try {
      const { logs } = await auditService.getAuditLogs({ limite: 10 });
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error al cargar logs:', error);
    }
  };

  const handleRoleAssignment = async (result: RoleAssignmentResult) => {
    if (result.success) {
      // Recargar datos
      await loadData();
      loadRecentLogs();

      // Mostrar notificación de éxito
      alert(`Rol asignado exitosamente a ${result.data?.userId}`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleRoleAssignmentError = (error: string) => {
    alert(`Error: ${error}`);
  };

  const getRoleBadgeColor = (roleName?: string) => {
    const colors: Record<string, string> = {
      'estudiante': 'bg-gray-100 text-gray-800',
      'moderador': 'bg-blue-100 text-blue-800',
      'admin': 'bg-orange-100 text-orange-800',
      'superadmin': 'bg-red-100 text-red-800'
    };
    return colors[roleName || ''] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLevelText = (level?: number) => {
    if (!level) return 'Sin rol';
    if (level === 1) return 'Estudiante';
    if (level === 2) return 'Moderador';
    if (level === 3) return 'Administrador';
    if (level === 4) return 'Superadmin';
    return 'Desconocido';
  };

  const totalUsers = users.length;
  const usersWithRoles = users.filter(u => u.role_name).length;
  const usersWithoutRoles = totalUsers - usersWithRoles;

  return (
    <div className=\"space-y-6\">
      {/* Navegación por pestañas */}
      <div className=\"flex space-x-1 bg-gray-100 p-1 rounded-lg\">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Resumen
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'assignments'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Asignación de Roles
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'audit'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Auditoría
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'security'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Seguridad
        </button>
      </div>

      {/* Contenido de pestañas */}
      {activeTab === 'overview' && (
        <div className=\"space-y-6\">
          {/* Tarjetas de resumen */}
          <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
            <div className=\"bg-white p-6 rounded-lg shadow border border-gray-200\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm text-gray-600\">Usuarios Totales</p>
                  <p className=\"text-2xl font-bold text-gray-900\">{totalUsers}</p>
                </div>
                <div className=\"text-blue-500 text-2xl\">👥</div>
              </div>
            </div>

            <div className=\"bg-green-50 p-6 rounded-lg shadow border border-green-200\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm text-green-600\">Con Roles</p>
                  <p className=\"text-2xl font-bold text-green-900\">{usersWithRoles}</p>
                </div>
                <div className=\"text-green-500 text-2xl\">✅</div>
              </div>
            </div>

            <div className=\"bg-orange-50 p-6 rounded-lg shadow border border-orange-200\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm text-orange-600\">Sin Roles</p>
                  <p className=\"text-2xl font-bold text-orange-900\">{usersWithoutRoles}</p>
                </div>
                <div className=\"text-orange-500 text-2xl\">⚠️</div>
              </div>
            </div>

            <div className=\"bg-purple-50 p-6 rounded-lg shadow border border-purple-200\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm text-purple-600\">Total Roles</p>
                  <p className=\"text-2xl font-bold text-purple-900\">{roles.length}</p>
                </div>
                <div className=\"text-purple-500 text-2xl\">🎭</div>
              </div>
            </div>
          </div>

          {/* Estadísticas de auditoría */}
          {statistics && (
            <div className=\"bg-white p-6 rounded-lg shadow border border-gray-200\">
              <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Estadísticas de Auditoría</h3>
              <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                <div className=\"text-center\">
                  <p className=\"text-3xl font-bold text-blue-600\">{statistics.total_cambios}</p>
                  <p className=\"text-sm text-gray-600\">Cambios Totales</p>
                </div>
                <div className=\"text-center\">
                  <p className=\"text-3xl font-bold text-green-600\">{statistics.actividades_recientes?.[0]?.count || 0}</p>
                  <p className=\"text-sm text-gray-600\">Actividad Hoy</p>
                </div>
                <div className=\"text-center\">
                  <p className=\"text-3xl font-bold text-orange-600\">{statistics.cambios_por_usuario.length}</p>
                  <p className=\"text-sm text-gray-600\">Usuarios Activos</p>
                </div>
              </div>
            </div>
          )}

          {/* Roles disponibles */}
          <div className=\"bg-white p-6 rounded-lg shadow border border-gray-200\">
            <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Roles Disponibles</h3>
            <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4\">
              {roles.map((role) => (
                <div key={role.id} className=\"border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow\">
                  <div className=\"flex items-center justify-between mb-2\">
                    <span className=\"font-medium text-gray-900\">{role.name}</span>
                    <span className=\"text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full\">
                      Nivel {role.level}
                    </span>
                  </div>
                  <p className=\"text-sm text-gray-600 mb-2\">{role.description}</p>
                  <div className=\"flex items-center justify-between text-sm\">
                    <span className=\"text-gray-500\">{role.user_count} usuarios</span>
                    {hasPermission('roles', 'assign') && (
                      <span className=\"text-green-600 font-medium\">Asignar</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usuarios recientes */}
          <div className=\"bg-white p-6 rounded-lg shadow border border-gray-200\">
            <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Usuarios Recientes</h3>
            <div className=\"space-y-3\">
              {users.slice(0, 5).map((user) => (
                <div key={user.id} className=\"flex items-center justify-between p-3 bg-gray-50 rounded-lg\">
                  <div className=\"flex items-center space-x-3\">
                    <div className=\"w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium\">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className=\"font-medium text-gray-900\">{user.full_name}</p>
                      <p className=\"text-sm text-gray-600\">{user.email}</p>
                    </div>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    {user.role_name ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role_name)}`}>
                        {user.role_name}
                      </span>
                    ) : (
                      <span className=\"px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800\">
                        Sin rol
                      </span>
                    )}
                    {hasPermission('roles', 'assign') && (
                      <button
                        onClick={() => setSelectedRole(user.id)}
                        className=\"text-blue-600 hover:text-blue-800 text-sm font-medium\"
                      >
                        Gestionar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className=\"space-y-6\">
          {/* Formulario de asignación de roles */}
          {hasPermission('roles', 'assign') && (
            <div className=\"bg-white p-6 rounded-lg shadow border border-gray-200\">
              <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">Asignación de Roles</h3>
              <RoleAssignmentForm
                onSuccess={handleRoleAssignment}
                onError={handleRoleAssignmentError}
              />
            </div>
          )}

          {/* Lista de usuarios con filtros */}
          <div className=\"bg-white p-6 rounded-lg shadow border border-gray-200\">
            <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0\">
              <h3 className=\"text-lg font-semibold text-gray-900\">Gestión de Usuarios</h3>

              <form onSubmit={handleSubmit(() => {})} className=\"flex flex-col sm:flex-row gap-3\">
                <input
                  type=\"text\"
                  placeholder=\"Buscar usuario...\"
                  {...register('search_user')}
                  className=\"px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                />

                <select
                  {...register('filter_role')}
                  className=\"px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                >
                  <option value=\"\">Todos los roles</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name} (Nivel {role.level})
                    </option>
                  ))}
                </select>

                <select
                  {...register('filter_status')}
                  className=\"px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500\"
                >
                  <option value=\"all\">Todos los usuarios</option>
                  <option value=\"with_role\">Con roles</option>
                  <option value=\"without_role\">Sin roles</option>
                </select>
              </form>
            </div>

            {/* Tabla de usuarios */}
            <div className=\"overflow-x-auto\">
              <table className=\"min-w-full divide-y divide-gray-200\">
                <thead className=\"bg-gray-50\">
                  <tr>
                    <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                      Usuario
                    </th>
                    <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                      Email
                    </th>
                    <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                      Rol Actual
                    </th>
                    <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                      Nivel
                    </th>
                    <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                      Estado
                    </th>
                    <th className=\"px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider\">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className=\"bg-white divide-y divide-gray-200\">
                  {users.map((user) => (
                    <tr key={user.id} className=\"hover:bg-gray-50\">
                      <td className=\"px-6 py-4 whitespace-nowrap\">
                        <div className=\"text-sm font-medium text-gray-900\">{user.full_name}</div>
                      </td>
                      <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-600\">
                        {user.email}
                      </td>
                      <td className=\"px-6 py-4 whitespace-nowrap\">
                        {user.role_name ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role_name)}`}>
                            {user.role_name}
                          </span>
                        ) : (
                          <span className=\"px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800\">
                            Sin rol
                          </span>
                        )}
                      </td>
                      <td className=\"px-6 py-4 whitespace-nowrap text-sm text-gray-600\">
                        {getRoleLevelText(user.role_level)}
                      </td>
                      <td className=\"px-6 py-4 whitespace-nowrap\">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className=\"px-6 py-4 whitespace-nowrap text-sm font-medium\">
                        {hasPermission('roles', 'assign') && (
                          <button
                            onClick={() => setSelectedRole(user.id)}
                            className=\"text-blue-600 hover:text-blue-900 mr-3\"
                          >
                            Asignar
                          </button>
                        )}
                        {hasPermission('audit', 'read') && (
                          <button
                            onClick={() => {
                              // Lógica para ver historial de auditoría del usuario
                            }}
                            className=\"text-gray-600 hover:text-gray-900\"
                          >
                            Ver historial
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className=\"text-center py-8 text-gray-500\">
                No se encontraron usuarios que coincidan con los filtros seleccionados.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <AuditLogsDashboard compact={false} />
      )}

      {activeTab === 'security' && (
        <SecurityDashboard compact={false} />
      )}
    </div>
  );
}