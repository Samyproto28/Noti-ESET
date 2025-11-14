# Arquitectura de Acceso a Datos

## Centralización de Queries en Servicios

Todas las operaciones de acceso a la base de datos (Supabase) están centralizadas en servicios (`newsService.js`, `forumService.js`, etc). Esto permite:

- **Evitar redundancia:** Ninguna query se repite en rutas o controladores. Si cambia la lógica de acceso, solo se modifica en un lugar.
- **Alta cohesión:** Cada servicio agrupa la lógica de un dominio (noticias, foro, usuarios).
- **Mantenibilidad:** Facilita el testing, el refactor y la extensión de funcionalidades.
- **Seguridad:** Permite aplicar validaciones y reglas de negocio antes de exponer datos.

## Ejemplo

Las rutas solo llaman funciones del servicio, nunca interactúan directamente con Supabase.

```js
const { getAllNews } = require('../services/newsService');
router.get('/', async (req, res) => {
  const { data, error } = await getAllNews();
  // ...
});
``` 