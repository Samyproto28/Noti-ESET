# Autenticación y Autorización

## JWT en el backend

- El backend genera un JWT propio tras el login exitoso con Supabase.
- El JWT contiene el id y email del usuario, y opcionalmente el rol.
- Todas las rutas privadas requieren el header `Authorization: Bearer <token>`.

## Roles

- El payload del JWT puede incluir un campo `role` (por defecto 'user').
- El middleware `authorizeRoles` permite proteger rutas para ciertos roles.

## Integración con Supabase Auth

- El login y registro se delegan a Supabase Auth.
- El backend solo confía en usuarios autenticados y verificados por Supabase.

## Ejemplo de uso

```js
// Proteger una ruta solo para admins
router.get('/admin', authMiddleware, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Solo admins pueden ver esto' });
});
``` 