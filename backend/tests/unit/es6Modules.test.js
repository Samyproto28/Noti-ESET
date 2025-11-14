import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

describe('Consistencia de Módulos ES6', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const srcPath = path.join(projectRoot, 'src');

  describe('Configuración package.json', () => {
    it('debería tener "type": "module" configurado', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = require(packageJsonPath);

      expect(packageJson.type).toBe('module');
    });

    it('no debería usar require en ningún archivo de src/', async () => {
      const fs = require('fs');
      const filesToCheck = [];

      // Función recursiva para encontrar todos los archivos JS
      function findJsFiles(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            findJsFiles(filePath);
          } else if (file.endsWith('.js')) {
            filesToCheck.push(filePath);
          }
        });
      }

      findJsFiles(srcPath);

      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Verificar que no haya require
        expect(content).not.toMatch(/require\s*\(/);
        expect(content).not.toMatch(/module\.exports/);
        expect(content).not.toMatch(/exports\./);
      }
    });

    it('debería usar import/export en todos los archivos de src/', async () => {
      const fs = require('fs');
      const filesToCheck = [];

      function findJsFiles(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            findJsFiles(filePath);
          } else if (file.endsWith('.js')) {
            filesToCheck.push(filePath);
          }
        });
      }

      findJsFiles(srcPath);

      let hasImportsOrExports = false;

      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Verificar que use import o export
        if (content.includes('import ') || content.includes('export ')) {
          hasImportsOrExports = true;
        }
      }

      expect(hasImportsOrExports).toBe(true);
    });
  });

  describe('Importaciones en archivos principales', () => {
    it('app.js debería usar solo importaciones ES6', async () => {
      const appPath = path.join(srcPath, 'app.js');
      const fs = require('fs');
      const content = fs.readFileSync(appPath, 'utf8');

      // NO debería tener require (ERROR DETECTADO)
      expect(content).not.toMatch(/require\s*\(/);
      expect(content).not.toMatch(/const.*require/);

      // SÍ debería tener import
      expect(content).toMatch(/import\s+.*from\s+/);
    });

    it('debería importar express correctamente', async () => {
      try {
        const { default: express } = await import(path.join(srcPath, 'app.js'));
        expect(express).toBeDefined();
        expect(typeof express).toBe('function');
      } catch (error) {
        // Si falla, verificar si es por inconsistencia de módulos
        expect(error.message).not.toContain('require');
      }
    });

    it('todas las rutas deberían exportar por defecto ES6', async () => {
      const routesPath = path.join(srcPath, 'routes');
      const fs = require('fs');
      const routeFiles = fs.readdirSync(routesPath).filter(file => file.endsWith('.js'));

      for (const routeFile of routeFiles) {
        const filePath = path.join(routesPath, routeFile);
        const content = fs.readFileSync(filePath, 'utf8');

        // Debería tener export default
        expect(content).toMatch(/export\s+default/);

        // No debería tener module.exports
        expect(content).not.toMatch(/module\.exports/);
      }
    });

    it('todos los servicios deberían usar export nombrados ES6', async () => {
      const servicesPath = path.join(srcPath, 'services');
      const fs = require('fs');

      if (fs.existsSync(servicesPath)) {
        const serviceFiles = fs.readdirSync(servicesPath).filter(file => file.endsWith('.js'));

        for (const serviceFile of serviceFiles) {
          const filePath = path.join(servicesPath, serviceFile);
          const content = fs.readFileSync(filePath, 'utf8');

          // Debería tener export nombrados
          expect(content).toMatch(/export\s+\{[^}]+\}/);

          // No debería tener module.exports
          expect(content).not.toMatch(/module\.exports/);
        }
      }
    });
  });

  describe('Importaciones específicas problemáticas', () => {
    it('app.js no debería tener require de performanceMiddleware', async () => {
      const appPath = path.join(srcPath, 'app.js');
      const fs = require('fs');
      const content = fs.readFileSync(appPath, 'utf8');

      // ESTA PRUEBA DEBERÍA FALLAR - Detectar el error específico
      expect(content).not.toMatch(/getPerformanceStats.*require/);
      expect(content).not.toMatch(/resetPerformanceStats.*require/);
    });

    it('performanceMiddleware debería exportar usando ES6', async () => {
      const perfMiddlewarePath = path.join(srcPath, 'middleware', 'performanceMiddleware.js');
      const fs = require('fs');

      if (fs.existsSync(perfMiddlewarePath)) {
        const content = fs.readFileSync(perfMiddlewarePath, 'utf8');

        // Debería usar export nombrados
        expect(content).toMatch(/export\s+\{[^}]*getPerformanceStats/);
        expect(content).toMatch(/export\s+\{[^}]*resetPerformanceStats/);

        // No debería usar module.exports
        expect(content).not.toMatch(/module\.exports/);
      }
    });
  });

  describe('Controladores', () => {
    it('todos los controladores deberían exportar funciones ES6', async () => {
      const controllersPath = path.join(srcPath, 'controllers');
      const fs = require('fs');

      if (fs.existsSync(controllersPath)) {
        const controllerFiles = fs.readdirSync(controllersPath).filter(file => file.endsWith('.js'));

        for (const controllerFile of controllerFiles) {
          const filePath = path.join(controllersPath, controllerFile);
          const content = fs.readFileSync(filePath, 'utf8');

          // Debería tener export nombrados
          expect(content).toMatch(/export\s+\{[^}]+\}/);

          // No debería tener module.exports
          expect(content).not.toMatch(/module\.exports/);
        }
      }
    });
  });

  describe('Middleware', () => {
    it('todo el middleware debería usar ES6', async () => {
      const middlewarePath = path.join(srcPath, 'middleware');
      const fs = require('fs');

      if (fs.existsSync(middlewarePath)) {
        const middlewareFiles = fs.readdirSync(middlewarePath).filter(file => file.endsWith('.js'));

        for (const middlewareFile of middlewareFiles) {
          const filePath = path.join(middlewarePath, middlewareFile);
          const content = fs.readFileSync(filePath, 'utf8');

          // Debería usar export
          expect(content).toMatch(/export/);

          // No debería tener module.exports
          expect(content).not.toMatch(/module\.exports/);
        }
      }
    });
  });

  describe('Utils y helpers', () => {
    it('los utils deberían exportar correctamente', async () => {
      const utilsPath = path.join(srcPath, 'utils');
      const fs = require('fs');

      if (fs.existsSync(utilsPath)) {
        const utilFiles = fs.readdirSync(utilsPath).filter(file => file.endsWith('.js'));

        for (const utilFile of utilFiles) {
          const filePath = path.join(utilsPath, utilFile);
          const content = fs.readFileSync(filePath, 'utf8');

          // Debería usar export (default o nombrados)
          expect(content).toMatch(/export\s+(default|\{)/);

          // No debería tener module.exports
          expect(content).not.toMatch(/module\.exports/);
        }
      }
    });
  });

  describe('Importaciones relativas vs absolutas', () => {
    it('debería usar importaciones relativas consistentes', async () => {
      const fs = require('fs');
      const filesToCheck = [];

      function findJsFiles(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory() && !file.includes('node_modules')) {
            findJsFiles(filePath);
          } else if (file.endsWith('.js')) {
            filesToCheck.push(filePath);
          }
        });
      }

      findJsFiles(srcPath);

      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Verificar que las importaciones usen rutas relativas correctas
        const importMatches = content.match(/import\s+.*from\s+['"`]([^'"`]+)['"`]/g);

        if (importMatches) {
          importMatches.forEach(importLine => {
            // No debería empezar con ./ si es un paquete npm
            if (importLine.includes("'./") || importLine.includes('"./') || importLine.includes('`./')) {
              // Importación relativa - OK
            } else if (!importLine.includes('http') && !importLine.includes('@supabase') && !importLine.includes('express')) {
              // Podría ser una importación absoluta que debería ser relativa
              const fromMatch = importLine.match(/from\s+['"`]([^'"`]+)['"`]/);
              if (fromMatch) {
                const importPath = fromMatch[1];
                // Si no empieza con ./ y no es un paquete conocido, podría ser problemático
                if (!importPath.startsWith('./') && !importPath.startsWith('@') && !importPath.includes('/')) {
                  console.warn(`Posible importación problemática en ${filePath}: ${importLine}`);
                }
              }
            }
          });
        }
      }
    });
  });

  describe('Extensiones de archivo', () => {
    it('debería incluir .js en todas las importaciones locales', async () => {
      const fs = require('fs');
      const filesToCheck = [];

      function findJsFiles(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory() && !file.includes('node_modules')) {
            findJsFiles(filePath);
          } else if (file.endsWith('.js')) {
            filesToCheck.push(filePath);
          }
        });
      }

      findJsFiles(srcPath);

      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Encontrar importaciones locales (que empiezan con ./ o ../)
        const localImports = content.match(/import\s+.*from\s+['"`](\.\.\/.*|\.\/.*)['"`]/g);

        if (localImports) {
          localImports.forEach(importLine => {
            const fromMatch = importLine.match(/from\s+['"`]([^'"`]+)['"`]/);
            if (fromMatch) {
              const importPath = fromMatch[1];
              // Las importaciones locales deberían incluir .js
              expect(importPath).toEndWith('.js');
            }
          });
        }
      }
    });
  });

  describe('Ciclos de importación', () => {
    it('no debería tener ciclos de importación', async () => {
      // Esta es una prueba básica para detectar ciclos obvios
      const fs = require('fs');
      const importGraph = {};
      const filesToCheck = [];

      function findJsFiles(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory() && !file.includes('node_modules')) {
            findJsFiles(filePath);
          } else if (file.endsWith('.js')) {
            filesToCheck.push(filePath);
          }
        });
      }

      findJsFiles(srcPath);

      // Construir grafo de importaciones
      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(srcPath, filePath);
        importGraph[relativePath] = [];

        const localImports = content.match(/import\s+.*from\s+['"`](\.\.\/.*|\.\/.*)['"`]/g);

        if (localImports) {
          localImports.forEach(importLine => {
            const fromMatch = importLine.match(/from\s+['"`]([^'"`]+)['"`]/);
            if (fromMatch) {
              const importPath = fromMatch[1];
              const resolvedPath = path.resolve(path.dirname(filePath), importPath);
              const relativeImportPath = path.relative(srcPath, resolvedPath);
              importGraph[relativePath].push(relativeImportPath);
            }
          });
        }
      }

      // Detectar ciclos (algoritmo simple)
      function hasCycle(graph, node, visited = new Set(), recursionStack = new Set()) {
        visited.add(node);
        recursionStack.add(node);

        for (const neighbor of graph[node] || []) {
          if (!visited.has(neighbor)) {
            if (hasCycle(graph, neighbor, visited, recursionStack)) {
              return true;
            }
          } else if (recursionStack.has(neighbor)) {
            return true; // Ciclo detectado
          }
        }

        recursionStack.delete(node);
        return false;
      }

      for (const node of Object.keys(importGraph)) {
        expect(hasCycle(importGraph, node)).toBe(false);
      }
    });
  });

  describe('Imports dinámicos', () => {
    it('debería manejar imports dinámicos correctamente si se usan', async () => {
      const fs = require('fs');
      const filesToCheck = [];

      function findJsFiles(dir) {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory() && !file.includes('node_modules')) {
            findJsFiles(filePath);
          } else if (file.endsWith('.js')) {
            filesToCheck.push(filePath);
          }
        });
      }

      findJsFiles(srcPath);

      for (const filePath of filesToCheck) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Verificar que los imports dinámicos usen la sintaxis correcta
        const dynamicImports = content.match(/import\s*\(/g);

        if (dynamicImports) {
          // Si hay imports dinámicos, deberían usar await
          expect(content).toMatch(/await\s+import\s*\(/);
        }
      }
    });
  });
});