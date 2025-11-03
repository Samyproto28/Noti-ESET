# Assets Directory

## Imágenes Disponibles

- `logo eset.png` - Logo oficial de ESET UNQ
- `cancelacion act.jpg` - Imagen para noticias de cancelación
- `foto header.jpg` - Foto para header/banner
- `foto mural.jpg` - Foto del mural de ESET
- `taller eset1.jpg` - Foto del taller ESET (1)
- `taller eset2.jpg` - Foto del taller ESET (2)

## Notas sobre la Refactorización

Durante la reorganización del proyecto, algunas imágenes originales de la galería (feria_intercambio, ronda_1-5, etc.) se perdieron. 

**Para restaurar la galería completa:**
1. Añadir las imágenes faltantes a esta carpeta:
   - `feria_intercambio1.jpg`
   - `feria_intercambio_comida.jpg` 
   - `feria_intercambio_grupo.jpg`
   - `ronda_1.jpg` a `ronda_5.jpg`
   - `734eaf6e-0aa7-4e4a-806a-e64fb3941b5b.jpg`

2. Actualizar las rutas en `index.html` para usar las imágenes correctas

**Estructura actual:**
- La galería usa las imágenes disponibles como placeholder
- Todas las rutas apuntan correctamente a `assets/`
- El frontend funciona sin errores 404