'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { roleAssignmentService, type RoleAssignmentResult } from '@/lib/roleAssignment';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const roleAssignmentSchema = z.object({
  target_user_id: z.string().uuid('ID de usuario inválido'),
  target_role_id: z.string().uuid('ID de rol inválido'),
  reason: z.string().max(200, 'La razón debe tener máximo 200 caracteres').optional()
});

type RoleAssignmentFormData = z.infer<typeof roleAssignmentSchema>;

interface RoleAssignmentFormProps {
  onSuccess?: (result: RoleAssignmentResult) => void;
  onError?: (error: string) => void;
}

interface UserOption {
  id: string;
  email: string;
  full_name: string;
}

interface RoleOption {
  id: string;
  name: string;
  level: number;
}

export function RoleAssignmentForm({ onSuccess, onError }: RoleAssignmentFormProps) {
  const { hasPermission, hasRole, user } = usePermissions();
  const [usersWithoutRoles, setUsersWithoutRoles] = useState<UserOption[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isCheckingValidation, setIsCheckingValidation] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<RoleAssignmentFormData>({
    resolver: zodResolver(roleAssignmentSchema),
    defaultValues: {
      reason: 'asignacion_manual'
    }
  });

  const watchedTargetUserId = watch('target_user_id');
  const watchedTargetRoleId = watch('target_role_id');

  // Cargar datos iniciales cuando el usuario cambia
  useEffect(() => {
    if (!user) return;

    const loadFormData = async () => {
      try {
        const [users, roles] = await Promise.all([
          roleAssignmentService.getUsersWithoutRoles(),
          roleAssignmentService.getAvailableRoles(user.id)
        ]);

        setUsersWithoutRoles(users);
        setAvailableRoles(roles);
      } catch (error) {
        console.error('Error al cargar datos del formulario:', error);
        onError?.('Error al cargar datos necesarios');
      }
    };

    loadFormData();
  }, [user, onError]);

  // Validar asignación cuando cambian los campos
  useEffect(() => {
    if (!user || !watchedTargetUserId || !watchedTargetRoleId) return;

    const validateAssignment = async () => {
      setIsCheckingValidation(true);
      try {
        const response = await fetch(`/api/roles/validate-assignment?admin_id=${user.id}&target_user_id=${watchedTargetUserId}&target_role_id=${watchedTargetRoleId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        setValidationResults(data);
      } catch (error) {
        console.error('Error en validación:', error);
        setValidationResults(null);
      } finally {
        setIsCheckingValidation(false);
      }
    };

    const timeoutId = setTimeout(validateAssignment, 500); // Debounce
    return () => clearTimeout(timeoutId);
    }, [user, watchedTargetUserId, watchedTargetRoleId]);

  const onSubmit = async (data: RoleAssignmentFormData) => {
    if (!user) {
      onError?.('Usuario no autenticado');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await roleAssignmentService.assignRole(user.id, {
        targetUserId: data.target_user_id,
        targetRoleId: data.target_role_id,
        reason: data.reason,
        ipAddress: '', // Se obtendrá del middleware
        userAgent: navigator.userAgent,
        metadata: {
          form_submission: true,
          timestamp: new Date().toISOString()
        }
      });

      if (result.success) {
        reset();
        setValidationResults(null);
        onSuccess?.(result);
        // Recargar datos para actualizar el formulario
        const [users, roles] = await Promise.all([
          roleAssignmentService.getUsersWithoutRoles(),
          roleAssignmentService.getAvailableRoles(user.id)
        ]);
        setUsersWithoutRoles(users);
        setAvailableRoles(roles);
      } else {
        onError?.(result.error || 'Error al asignar el rol');
      }
    } catch (error) {
      console.error('Error en la asignación:', error);
      onError?.('Error interno del servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (!user || !watchedTargetUserId || !watchedTargetRoleId) return false;
    return validationResults?.success === true && !isSubmitting && !isCheckingValidation;
  };

  const getValidationStatus = () => {
    if (isCheckingValidation) return { status: 'checking', message: 'Validando...' };
    if (!validationResults) return { status: 'pending', message: 'Seleccione usuario y rol' };
    if (validationResults.success) return { status: 'valid', message: 'Asignación válida' };
    return { status: 'invalid', message: validationResults.message || 'Asignación no válida' };
  };

  const validationStatus = getValidationStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Asignación de Roles</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Rol actual:</span>
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            {userRoleName || 'No asignado'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Campo: Usuario sin rol */}
        <div>
          <label htmlFor="target_user_id" className="block text-sm font-medium text-gray-700 mb-2">
            Usuario sin rol asignado
          </label>
          <select
            id="target_user_id"
            {...register('target_user_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={!user || isSubmitting || usersWithoutRoles.length === 0}
          >
            <option value="">Seleccione un usuario...</option>
            {usersWithoutRoles.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email} ({user.email})
              </option>
            ))}
          </select>
          {errors.target_user_id && (
            <p className="mt-1 text-sm text-red-600">{errors.target_user_id.message}</p>
          )}
          {usersWithoutRoles.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              No hay usuarios sin roles asignados
            </p>
          )}
        </div>

        {/* Campo: Rol disponible */}
        <div>
          <label htmlFor="target_role_id" className="block text-sm font-medium text-gray-700 mb-2">
            Rol a asignar
          </label>
          <select
            id="target_role_id"
            {...register('target_role_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={!user || isSubmitting || availableRoles.length === 0}
          >
            <option value="">Seleccione un rol...</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} (Nivel {role.level})
              </option>
            ))}
          </select>
          {errors.target_role_id && (
            <p className="mt-1 text-sm text-red-600">{errors.target_role_id.message}</p>
          )}
          {availableRoles.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              No hay roles disponibles para asignación
            </p>
          )}
        </div>

        {/* Campo: Razón */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Razón de la asignación
          </label>
          <input
            type="text"
            id="reason"
            {...register('reason')}
            placeholder="Ej: Promoción a administrador"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          />
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Opcional: máximo 200 caracteres
          </p>
        </div>

        {/* Estado de validación */}
        {watchedTargetUserId && watchedTargetRoleId && (
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              validationStatus.status === 'valid' ? 'bg-green-500' :
              validationStatus.status === 'invalid' ? 'bg-red-500' :
              validationStatus.status === 'checking' ? 'bg-yellow-500' :
              'bg-gray-400'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                validationStatus.status === 'valid' ? 'text-green-700' :
                validationStatus.status === 'invalid' ? 'text-red-700' :
                'text-gray-700'
              }`}>
                {validationStatus.message}
              </p>
              {validationStatus.status === 'valid' && validationResults?.validations && (
                <div className="mt-2 space-y-1">
                  {validationResults.validations.admin_level && (
                    <p className="text-xs text-gray-600">
                      Su nivel: {validationResults.validations.admin_level} |
                      Nivel del rol: {validationResults.validations.target_level}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botón de envío */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canSubmit()}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Asignando...
              </span>
            ) : (
              'Asignar Rol'
            )}
          </button>
        </div>

        {/* Información adicional */}
        {availableRoles.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Reglas de jerarquía:</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Superadmin (Nivel 4): Puede asignar cualquier rol</li>
              <li>• Admin (Nivel 3): Puede asignar roles de Estudiante y Moderador</li>
              <li>• Moderador (Nivel 2): No puede asignar roles</li>
              <li>• Estudiante (Nivel 1): No puede asignar roles</li>
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}