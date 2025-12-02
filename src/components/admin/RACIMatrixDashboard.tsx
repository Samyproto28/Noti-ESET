'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { raciService, type RACIMatrixEntry, type RoleResponsibility } from '@/lib/raciService';
import { usePermissions } from '@/lib/permissions';

const RACI_MATRIX = {
  RESPONSIBLE: { label: 'Responsable (R)', description: 'Those who do the work', color: 'bg-green-100 text-green-800' },
  ACCOUNTABLE: { label: 'Accountable (A)', description: 'Those who own the work', color: 'bg-red-100 text-red-800' },
  CONSULTED: { label: 'Consulted (C)', description: 'Those who provide input', color: 'bg-blue-100 text-blue-800' },
  INFORMED: { label: 'Informed (I)', description: 'Those who are kept updated', color: 'bg-yellow-100 text-yellow-800' }
};

const ROLES = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'moderador', label: 'Moderador' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' }
];

const BUSINESS_PROCESSES = [
  'User Management',
  'Access Control',
  'Content Management',
  'User Engagement',
  'Communication',
  'Media Management',
  'Education Management',
  'Community Management',
  'Security & Compliance',
  'System Administration',
  'Analytics & Reporting'
];

const CRITICALITY_LEVELS = [
  { value: 'low', label: 'Baja', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-800' }
];

export function RACIMatrixDashboard() {
  const { hasPermission, hasRole } = usePermissions();
  const [matrix, setMatrix] = useState<RACIMatrixEntry[]>([]);
  const [roleResponsibilities, setRoleResponsibilities] = useState<RoleResponsibility | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('estudiante');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [complianceReport, setComplianceReport] = useState<any>(null);

  useEffect(() => {
    loadRACIMatrix();
    loadComplianceReport();
  }, []);

  const loadRACIMatrix = async () => {
    try {
      const data = await raciService.getRACIMatrix();
      setMatrix(data);
    } catch (error) {
      console.error('Error loading RACI matrix:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComplianceReport = async () => {
    try {
      const report = await raciService.generateComplianceReport();
      setComplianceReport(report);
    } catch (error) {
      console.error('Error loading compliance report:', error);
    }
  };

  const loadRoleResponsibilities = async (role: string) => {
    try {
      const responsibilities = await raciService.getResponsibilitiesByRole(role);
      setRoleResponsibilities(responsibilities);
    } catch (error) {
      console.error('Error loading role responsibilities:', error);
    }
  };

  const filteredMatrix = matrix.filter(entry => {
    const matchesSearch = entry.permission_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProcess = selectedProcess === 'all' || entry.business_process === selectedProcess;
    const matchesCriticality = selectedCriticality === 'all' || entry.criticality_level === selectedCriticality;

    return matchesSearch && matchesProcess && matchesCriticality;
  });

  const handleRoleChange = async (role: string) => {
    setSelectedRole(role);
    await loadRoleResponsibilities(role);
  };

  const getCriticalityBadge = (level: string) => {
    const config = CRITICALITY_LEVELS.find(c => c.value === level);
    return config ? (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    ) : null;
  };

  const getRoleBadges = (roles: string[]) => {
    return roles.map(role => {
      const roleConfig = ROLES.find(r => r.value === role);
      return (
        <Badge key={role} variant="outline" className="mr-1">
          {roleConfig?.label || role}
        </Badge>
      );
    });
  };

  if (!hasRole('admin') && !hasRole('superadmin')) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Acceso Denegado
            </h3>
            <p className="text-gray-600">
              No tienes permisos para ver el dashboard de matriz RACI.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matriz RACI</h1>
          <p className="text-muted-foreground">
            Gestión de Responsabilidades y Permisos del Sistema
          </p>
        </div>
        <Button onClick={loadComplianceReport} variant="outline">
          Actualizar Reporte
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="Buscar permiso, recurso o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Proceso</label>
              <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proceso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los procesos</SelectItem>
                  {BUSINESS_PROCESSES.map(process => (
                    <SelectItem key={process} value={process}>
                      {process}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Criticidad</label>
              <Select value={selectedCriticality} onValueChange={setSelectedCriticality}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar criticidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  {CRITICALITY_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Rol</label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matrix">Matriz Completa</TabsTrigger>
          <TabsTrigger value="role-responsibilities">Responsabilidades por Rol</TabsTrigger>
          <TabsTrigger value="compliance">Reporte de Cumplimiento</TabsTrigger>
          <TabsTrigger value="critical-permissions">Permisos Críticos</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matriz RACI Completa</CardTitle>
              <CardDescription>
                {filteredMatrix.length} permisos mostrados de {matrix.length} totales
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Cargando matriz RACI...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permiso</TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Proceso</TableHead>
                        <TableHead>Criticidad</TableHead>
                        <TableHead>RACI</TableHead>
                        <TableHead>Impacto</TableHead>
                        <TableHead>Auditoría</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMatrix.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.permission_name}</TableCell>
                          <TableCell>{entry.resource}</TableCell>
                          <TableCell>{entry.action}</TableCell>
                          <TableCell>{entry.business_process}</TableCell>
                          <TableCell>{getCriticalityBadge(entry.criticality_level)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-xs">
                                <span className="font-medium">R:</span> {getRoleBadges(entry.responsible)}
                              </div>
                              <div className="text-xs">
                                <span className="font-medium">A:</span> {getRoleBadges(entry.accountable)}
                              </div>
                              <div className="text-xs">
                                <span className="font-medium">C:</span> {getRoleBadges(entry.consulted)}
                              </div>
                              <div className="text-xs">
                                <span className="font-medium">I:</span> {getRoleBadges(entry.informed)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.compliance_impact && (
                              <Badge variant="destructive">Cumplimiento</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.audit_required && (
                              <Badge variant="outline">Sí</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role-responsibilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Responsabilidades por Rol - {ROLES.find(r => r.value === selectedRole)?.label}</CardTitle>
              <CardDescription>
                Vista detallada de responsabilidades, cuenta y consultas para el rol seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roleResponsibilities && (
                <div className="space-y-6">
                  {/* Responsabilidades (R) */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-700">
                      Responsable (R) - {roleResponsibilities.responsibilities.length} permisos
                    </h3>
                    {roleResponsibilities.responsibilities.length > 0 ? (
                      <div className="grid gap-3">
                        {roleResponsibilities.responsibilities.map((resp, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-green-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{resp.permission_name}</span>
                              {getCriticalityBadge(resp.criticality_level)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{resp.description}</p>
                            <div className="text-xs text-gray-500">
                              Proceso: {resp.business_process} | Impacto: {resp.compliance_impact ? 'Cumplimiento' : 'Normal'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No hay responsabilidades asignadas a este rol.</p>
                    )}
                  </div>

                  {/* Accountable (A) */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-700">
                      Accountable (A) - {roleResponsibilities.accountable_for.length} permisos
                    </h3>
                    {roleResponsibilities.accountable_for.length > 0 ? (
                      <div className="grid gap-3">
                        {roleResponsibilities.accountable_for.map((acc, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-red-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{acc.permission_name}</span>
                              {getCriticalityBadge(acc.criticality_level)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{acc.description}</p>
                            <div className="text-xs text-gray-500">
                              Proceso: {acc.business_process} | Responsable de aprobar y asegurar calidad
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No hay responsabilidades de cuenta asignadas a este rol.</p>
                    )}
                  </div>

                  {/* Consulted (C) */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-blue-700">
                      Consultado (C) - {roleResponsibilities.consulted_on.length} permisos
                    </h3>
                    {roleResponsibilities.consulted_on.length > 0 ? (
                      <div className="grid gap-3">
                        {roleResponsibilities.consulted_on.map((con, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-blue-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{con.permission_name}</span>
                              {getCriticalityBadge(con.criticality_level)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{con.description}</p>
                            <div className="text-xs text-gray-500">
                              Proceso: {con.business_process} | Debe ser consultado antes de ejecutar
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No hay consultas asignadas a este rol.</p>
                    )}
                  </div>

                  {/* Informed (I) */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-yellow-700">
                      Informado (I) - {roleResponsibilities.informed_of.length} permisos
                    </h3>
                    {roleResponsibilities.informed_of.length > 0 ? (
                      <div className="grid gap-3">
                        {roleResponsibilities.informed_of.map((inf, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-yellow-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{inf.permission_name}</span>
                              {getCriticalityBadge(inf.criticality_level)}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{inf.description}</p>
                            <div className="text-xs text-gray-500">
                              Proceso: {inf.business_process} | Debe ser mantenido informado
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No hay informaciones asignadas a este rol.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          {complianceReport && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Cumplimiento</CardTitle>
                  <CardDescription>
                    Estado general del sistema de permisos y cumplimiento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {complianceReport.summary.total_permissions}
                      </div>
                      <div className="text-sm text-gray-600">Total Permisos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {complianceReport.summary.critical_permissions}
                      </div>
                      <div className="text-sm text-gray-600">Críticos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {complianceReport.summary.compliance_permissions}
                      </div>
                      <div className="text-sm text-gray-600">Cumplimiento</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {complianceReport.summary.auditable_permissions}
                      </div>
                      <div className="text-sm text-gray-600">Auditables</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Por Proceso de Negocio</CardTitle>
                  <CardDescription>
                    Desglose de permisos por proceso y nivel de criticidad
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {complianceReport.by_business_process.map((process: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{process.process}</h4>
                          <div className="flex space-x-2">
                            <Badge variant="outline">{process.permissions} permisos</Badge>
                            {process.critical > 0 && (
                              <Badge variant="destructive">{process.critical} críticos</Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-green-600">Cumplimiento:</span> {process.compliance}
                          </div>
                          <div>
                            <span className="font-medium text-blue-600">Auditables:</span> {process.auditable}
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Críticos:</span> {process.critical}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {complianceReport.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recomendaciones</CardTitle>
                    <CardDescription>
                      Acciones recomendadas para mejorar el cumplimiento y seguridad
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription className="list-disc list-inside space-y-1">
                        {complianceReport.recommendations.map((rec: string, index: number) => (
                          <div key={index}>{rec}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="critical-permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permisos Críticos</CardTitle>
              <CardDescription>
                Permisos con nivel crítico que requieren atención especial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matrix.filter(p => p.criticality_level === 'critical').map((permission, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-red-50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-lg">{permission.permission_name}</span>
                        <Badge variant="destructive" className="ml-2">CRÍTICO</Badge>
                      </div>
                      <Badge variant="outline">{permission.business_process}</Badge>
                    </div>
                    <p className="text-gray-700 mb-3">{permission.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Recurso:</span> {permission.resource}
                      </div>
                      <div>
                        <span className="font-medium">Acción:</span> {permission.action}
                      </div>
                      <div>
                        <span className="font-medium">Responsable:</span> {getRoleBadges(permission.responsible)}
                      </div>
                      <div>
                        <span className="font-medium">Cuenta:</span> {getRoleBadges(permission.accountable)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}