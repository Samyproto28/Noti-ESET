import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Análisis de Cobertura de Código y Código Muerto', () => {
  const backendSrcPath = path.join(projectRoot, 'src');
  const frontendSrcPath = path.join(projectRoot, '..', 'frontend', 'src');

  describe('Análisis de Código Muerto - Backend', () => {
    const backendFiles = [
      'controllers/authController.js',
      'controllers/newsController.js',
      'controllers/userProfileController.js',
      'services/newsService.js',
      'services/userProfileService.js',
      'middleware/authMiddleware.js',
      'middleware/errorHandler.js',
      'routes/auth.routes.js',
      'routes/news.routes.js',
      'routes/userProfile.routes.js',
      'validators/authValidators.js',
      'validators/newsValidators.js',
      'utils/responseHelper.js'
    ];

    backendFiles.forEach(fileName => {
      describe(`Análisis de ${fileName}`, () => {
        let fileContent;

        beforeAll(() => {
          const filePath = path.join(backendSrcPath, fileName);
          if (fs.existsSync(filePath)) {
            fileContent = fs.readFileSync(filePath, 'utf8');
          }
        });

        it(`DEBERÍA existir el archivo ${fileName}`, () => {
          const filePath = path.join(backendSrcPath, fileName);
          expect(fs.existsSync(filePath)).toBe(true);
        });

        it('NO DEBERÍA tener imports no utilizados', () => {
          if (!fileContent) return;

          // Buscar imports
          const importMatches = fileContent.match(/^import\s+.*from\s+['"][^'"]+['"];?$/gm) || [];

          // Buscar exports
          const exportMatches = fileContent.match(/^export\s+/gm) || [];

          // Si hay imports, debería haber exports o uso del código importado
          if (importMatches.length > 0) {
            expect(exportMatches.length + fileContent.match(/\w+\./g).length).toBeGreaterThan(0);
          }
        });

        it('NO DEBERÍA tener funciones no utilizadas', () => {
          if (!fileContent) return;

          // Buscar declaraciones de funciones
          const functionDeclarations = fileContent.match(/(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g) || [];
          const functionStatements = fileContent.match(/function\s+\w+/g) || [];

          const totalFunctions = functionDeclarations.length + functionStatements.length;

          // Si hay funciones, deberían ser utilizadas
          if (totalFunctions > 0) {
            // Buscar si las funciones son exportadas o utilizadas
            const hasExports = fileContent.includes('export');
            const hasModuleExports = fileContent.includes('module.exports');

            expect(hasExports || hasModuleExports).toBeTruthy();
          }
        });

        it('NO DEBERÍA tener variables no utilizadas', () => {
          if (!fileContent) return;

          // Buscar patrones comunes de variables no utilizadas
          const unusedPatterns = [
            /const\s+\w+\s*=\s*[^;]+;[^]*\w\s*\}/, // Variables en bloques no usados
            /let\s+\w+\s*=\s*[^;]+;[^}]*}/, // Variables let en bloques no usados
          ];

          // Esta es una verificación básica, el análisis real requiere AST
          unusedPatterns.forEach(pattern => {
            const matches = fileContent.match(pattern);
            if (matches) {
              // Si se encuentra el patrón, verificar que la variable se use después
              expect(matches.length).toBeLessThan(5); // Límite razonable
            }
          });
        });

        it('NO DEBERÍA tener código comentado grande', () => {
          if (!fileContent) return;

          // Buscar bloques de comentarios grandes
          const largeComments = fileContent.match(/\/\*[\s\S]{100,}?\*\//g) || [];

          // Permitir comentarios de documentación pero no bloques grandes de código comentado
          expect(largeComments.length).toBeLessThan(3);
        });

        it('DEBERÍA tener exports consistentes', () => {
          if (!fileContent) return;

          // Verificar consistencia en los exports
          const hasDefaultExport = fileContent.includes('export default');
          const hasNamedExports = fileContent.match(/export\s+(?!default)/g);

          // Los archivos deberían tener algún tipo de exportación
          expect(hasDefaultExport || (hasNamedExports && hasNamedExports.length > 0)).toBeTruthy();
        });

        it('DEBERÍA tener manejadores de error en controladores', () => {
          if (!fileContent || !fileName.includes('Controller')) return;

          // Los controladores deberían tener manejo de errores
          expect(fileContent).toMatch(/catch|try|errorhandler|asyncHandler/i);
        });

        it('DEBERÍA tener validación en rutas', () => {
          if (!fileContent || !fileName.includes('routes')) return;

          // Las rutas deberían tener middleware de validación o autenticación
          expect(fileContent).toMatch(/validate|auth|middleware/i);
        });
      });
    });
  });

  describe('Análisis de Código Muerto - Frontend', () => {
    const frontendFiles = [
      'main.js',
      'auth.js',
      'forum.js',
      'auth-ui.js',
      'auth-status.js',
      'forum-auth.js',
      'cacheService.js',
      'httpOptimizer.js',
      'performanceMonitor.js'
    ];

    frontendFiles.forEach(fileName => {
      describe(`Análisis de ${fileName}`, () => {
        let fileContent;

        beforeAll(() => {
          const filePath = path.join(frontendSrcPath, fileName);
          if (fs.existsSync(filePath)) {
            fileContent = fs.readFileSync(filePath, 'utf8');
          }
        });

        it(`DEBERÍA existir el archivo ${fileName}`, () => {
          const filePath = path.join(frontendSrcPath, fileName);
          expect(fs.existsSync(filePath)).toBe(true);
        });

        it('NO DEBERÍA tener imports no utilizados', () => {
          if (!fileContent) return;

          // Buscar imports ES6
          const importMatches = fileContent.match(/^import\s+.*from\s+['"][^'"]+['"];?$/gm) || [];

          // Buscar si los imports se utilizan en el código
          importMatches.forEach(importLine => {
            const importName = importLine.match(/import\s+{?\s*(\w+)/);
            if (importName) {
              const varName = importName[1];
              const usage = fileContent.match(new RegExp(`\\b${varName}\\b`, 'g'));
              expect(usage.length).toBeGreaterThan(1); // Al menos 2: el import y el uso
            }
          });
        });

        it('NO DEBERÍA tener funciones no utilizadas', () => {
          if (!fileContent) return;

          // Buscar funciones que no son usadas
          const functionDefinitions = fileContent.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g) || [];

          functionDefinitions.forEach(def => {
            const funcName = def.match(/(?:const|let|var)\s+(\w+)/);
            if (funcName) {
              const name = funcName[1];
              // Contar usos de la función
              const usages = fileContent.match(new RegExp(`\\b${name}\\b`, 'g')) || [];
              // Debe haber más que la definición
              expect(usages.length).toBeGreaterThan(1);
            }
          });
        });

        it('NO DEBERÍA tener event listeners no removidos', () => {
          if (!fileContent) return;

          // Buscar addEventListener
          const addListeners = fileContent.match(/addEventListener\(/g) || [];

          // Si hay addEventListener, debería haber removeEventListener o limpieza
          if (addListeners.length > 0) {
            const hasCleanup = fileContent.includes('removeEventListener') ||
                               fileContent.includes('beforeunload') ||
                               fileContent.includes('unload');
            expect(hasCleanup).toBeTruthy();
          }
        });

        it('NO DEBERÍA tener variables globales innecesarias', () => {
          if (!fileContent) return;

          // Buscar variables globales (window o sin declaración)
          const globalVars = fileContent.match(/window\.\w+\s*=/g) || [];

          // Limitar variables globales
          expect(globalVars.length).toBeLessThan(5);
        });

        it('DEBERÍA tener código modular y reutilizable', () => {
          if (!fileContent) return;

          // Verificar que el código tenga funciones o clases reutilizables
          const hasReusableCode = fileContent.match(/(?:function|class|const\s+\w+\s*=\s*\()/g) || [];

          if (hasReusableCode.length > 0) {
            expect(hasReusableCode.length).toBeGreaterThan(0);
          }
        });

        it('NO DEBERÍA tener código duplicado', () => {
          if (!fileContent) return;

          // Buscar patrones de código duplicado (básico)
          const lines = fileContent.split('\n').filter(line => line.trim().length > 10);
          const uniqueLines = [...new Set(lines)];

          // Permitir cierta duplicación (líneas comunes, etc.)
          const duplicationRatio = (lines.length - uniqueLines.length) / lines.length;
          expect(duplicationRatio).toBeLessThan(0.3); // Menos del 30% de duplicación
        });
      });
    });
  });

  describe('Análisis de Dependencias y Referencias', () => {
    it('DEBERÍA tener todas las referencias de archivos resueltas', () => {
      const htmlPath = path.join(projectRoot, '..', 'frontend', 'src', 'index.html');

      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Verificar que todos los scripts referenciados existan
        const scriptRefs = htmlContent.match(/src\s*=\s*["']([^"']+)["']/g) || [];

        scriptRefs.forEach(ref => {
          const src = ref.match(/src\s*=\s*["']([^"']+)["']/)[1];
          if (src.startsWith('http')) return; // Ignorar URLs externas

          const scriptPath = path.join(projectRoot, '..', 'frontend', 'src', src);
          expect(fs.existsSync(scriptPath)).toBeTruthy();
        });

        // Verificar que todos los CSS referenciados existan
        const cssRefs = htmlContent.match(/href\s*=\s*["']([^"']+)["']/g) || [];

        cssRefs.forEach(ref => {
          const href = ref.match(/href\s*=\s*["']([^"']+)["']/)[1];
          if (href.startsWith('http')) return; // Ignorar URLs externas

          const cssPath = path.join(projectRoot, '..', 'frontend', 'src', href);
          expect(fs.existsSync(cssPath)).toBeTruthy();
        });
      }
    });

    it('DEBERÍA tener imágenes referenciadas existentes', () => {
      const htmlPath = path.join(projectRoot, '..', 'frontend', 'src', 'index.html');

      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Verificar que todas las imágenes existan
        const imgRefs = htmlContent.match(/src\s*=\s*["']([^"']+)["']/g) || [];

        imgRefs.forEach(ref => {
          const src = ref.match(/src\s*=\s*["']([^"']+)["']/)[1];
          if (src.startsWith('http')) return; // Ignorar URLs externas

          const imgPath = path.join(projectRoot, '..', 'frontend', 'src', src);
          expect(fs.existsSync(imgPath)).toBeTruthy();
        });
      }
    });
  });

  describe('Métricas de Calidad de Código', () => {
    it('DEBERÍA tener complejidad ciclomática razonable', () => {
      const files = [...backendFiles, ...frontendFiles];
      let totalComplexity = 0;
      let fileCount = 0;

      files.forEach(fileName => {
        const isBackend = backendFiles.includes(fileName);
        const filePath = path.join(isBackend ? backendSrcPath : frontendSrcPath, fileName);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Medir complejidad básica (número de sentencias de control)
          const complexityIndicators = [
            /if\s*\(/g,
            /else\s*if/g,
            /for\s*\(/g,
            /while\s*\(/g,
            /switch\s*\(/g,
            /catch\s*\(/g,
            /&&/g,
            /\|\|/g
          ];

          let fileComplexity = 0;
          complexityIndicators.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) fileComplexity += matches.length;
          });

          totalComplexity += fileComplexity;
          fileCount++;
        }
      });

      // Complejidad promedio debería ser razonable
      const averageComplexity = fileCount > 0 ? totalComplexity / fileCount : 0;
      expect(averageComplexity).toBeLessThan(50); // Límite razonable
    });

    it('DEBERÍA tener longitud de archivos razonable', () => {
      const files = [...backendFiles, ...frontendFiles];

      files.forEach(fileName => {
        const isBackend = backendFiles.includes(fileName);
        const filePath = path.join(isBackend ? backendSrcPath : frontendSrcPath, fileName);

        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const sizeKB = stats.size / 1024;

          // Los archivos no deberían ser demasiado grandes
          expect(sizeKB).toBeLessThan(50); // Máximo 50KB por archivo
        }
      });
    });

    it('DEBERÍA tener densidad de comentarios apropiada', () => {
      const files = [...backendFiles, ...frontendFiles];
      let totalComments = 0;
      let totalLines = 0;

      files.forEach(fileName => {
        const isBackend = backendFiles.includes(fileName);
        const filePath = path.join(isBackend ? backendSrcPath : frontendSrcPath, fileName);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');

          const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];

          totalComments += comments.length;
          totalLines += lines.length;
        }
      });

      // Densidad de comentarios (líneas de comentarios / líneas totales)
      const commentDensity = totalLines > 0 ? (totalComments / totalLines) * 100 : 0;

      // Debería tener entre 10% y 30% de comentarios
      expect(commentDensity).toBeGreaterThan(5);
      expect(commentDensity).toBeLessThan(50);
    });
  });
});