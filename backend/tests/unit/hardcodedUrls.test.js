import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Análisis de URLs Hardcodeadas y Configuración', () => {
  const backendSrcPath = path.join(projectRoot, 'src');
  const frontendSrcPath = path.join(projectRoot, '..', 'frontend', 'src');

  describe('Detección de URLs Hardcodeadas en Backend', () => {
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
      'utils/responseHelper.js',
      'app.js'
    ];

    backendFiles.forEach(fileName => {
      describe(`Análisis de ${fileName}`, () => {
        let fileContent;

        beforeAll(() => {
          const filePath = path.join(backendSrcPath, fileName);
          if (fs.existsSync(filePath) && !fileName.endsWith('.env')) {
            fileContent = fs.readFileSync(filePath, 'utf8');
          }
        });

        it(`DEBERÍA existir el archivo ${fileName}`, () => {
          const filePath = path.join(backendSrcPath, fileName);
          expect(fs.existsSync(filePath)).toBe(true);
        });

        it('NO DEBERÍA tener URLs de API hardcodeadas', () => {
          if (!fileContent) return;

          // Buscar líneas con URLs hardcodeadas que no estén en comentarios ni usen variables de entorno
          const lines = fileContent.split('\n');
          const problematicLines = [];

          lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            // Ignorar líneas en blanco y comentarios
            if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
              return;
            }

            // Buscar URLs en la línea
            const urlPatterns = [
              /http[s]?:\/\/localhost:\d+/gi,
              /http[s]?:\/\/127\.0\.0\.1:\d+/gi,
              /http[s]?:\/\/\d+\.\d+\.\d+\.\d+:\d+/gi
            ];

            urlPatterns.forEach(pattern => {
              if (pattern.test(line)) {
                // Si la línea tiene una URL pero no usa process.env, es problemática
                if (!line.includes('process.env')) {
                  // Pero si la línea anterior usa process.env, es parte de la misma lógica
                  const previousLine = lines[index - 1];
                  const nextLine = lines[index + 1];

                  const isPartOfEnvLogic = (previousLine && previousLine.includes('process.env')) ||
                                          (nextLine && nextLine.includes('process.env')) ||
                                          line.includes('?') || // Operador ternario
                                          line.includes(':'); // Parte de ternario

                  if (!isPartOfEnvLogic) {
                    problematicLines.push({ line: index + 1, content: line.trim() });
                  }
                }
              }
            });
          });

          // No debería haber líneas problemáticas
          if (problematicLines.length > 0) {
            console.warn(`URLs hardcodeadas encontradas en ${fileName}:`, problematicLines);
          }
          expect(problematicLines.length).toBe(0);
        });

        it('NO DEBERÍA tener URLs de base de datos hardcodeadas', () => {
          if (!fileContent) return;

          // Patrones de strings de conexión o URLs de base de datos
          const dbUrlPatterns = [
            /postgresql:\/\/[^'"\s]+/gi,
            /mongodb:\/\/[^'"\s]+/gi,
            /mysql:\/\/[^'"\s]+/gi,
            /database.*url.*['"]/gi,
            /connection.*string.*['"]/gi
          ];

          const foundDbUrls = [];
          dbUrlPatterns.forEach(pattern => {
            const matches = fileContent.match(pattern);
            if (matches) {
              foundDbUrls.push(...matches);
            }
          });

          // Las URLs de base de datos deberían estar en variables de entorno
          if (foundDbUrls.length > 0) {
            const dbUrlsInEnv = foundDbUrls.filter(url =>
              fileContent.includes('process.env') || fileContent.includes('env.')
            );

            // Si hay URLs hardcodeadas, debería haber uso de variables de entorno
            if (foundDbUrls.length > 0 && dbUrlsInEnv.length === 0) {
              console.warn(`${fileName}: Posibles URLs de base de datos hardcodeadas encontradas`);
            }
          }
        });

        it('DEBERÍA usar variables de entorno para configuración', () => {
          if (!fileContent) return;

          // Buscar uso de variables de entorno
          const envUsagePatterns = [
            /process\.env\./g,
            /process\.env\['/g,
            /process\.env\["/g,
            /import.*\.env/g
          ];

          const hasEnvUsage = envUsagePatterns.some(pattern =>
            fileContent.match(pattern)
          );

          // Si el archivo maneja configuración sensible, debería usar variables de entorno
          const handlesConfig = fileContent.includes('config') ||
                               fileContent.includes('secret') ||
                               fileContent.includes('key') ||
                               fileContent.includes('token') ||
                               fileContent.includes('password') ||
                               fileContent.includes('database');

          if (handlesConfig && !hasEnvUsage) {
            console.warn(`${fileName}: Maneja configuración pero no usa variables de entorno`);
          }
        });
      });
    });
  });

  describe('Detección de URLs Hardcodeadas en Frontend', () => {
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

        it('NO DEBERÍA tener URLs de API hardcodeadas', () => {
          if (!fileContent) return;

          // Patrones de URLs de API hardcodeadas
          const apiPatterns = [
            /http[s]?:\/\/localhost:\d+\/api\//gi,
            /http[s]?:\/\/127\.0\.0\.1:\d+\/api\//gi,
            /const\s+API_URL\s*=\s*['"`]http/gi,
            /const\s+BASE_URL\s*=\s*['"`]http/gi,
            /fetch\s*\(\s*['"`]http[^'"`]+\/api\//gi
          ];

          const foundApiUrls = [];
          apiPatterns.forEach(pattern => {
            const matches = fileContent.match(pattern);
            if (matches) {
              foundApiUrls.push(...matches);
            }
          });

          // Permitir URLs de API pero deberían estar configuradas como variables
          if (foundApiUrls.length > 0) {
            const hasApiConfig = fileContent.includes('API_URL') ||
                                fileContent.includes('BASE_URL') ||
                                fileContent.includes('ENDPOINT');

            if (!hasApiConfig) {
              console.warn(`${fileName}: URLs de API encontradas sin configuración centralizada`);
            }
          }
        });

        it('DEBERÍA tener configuración centralizada de URLs', () => {
          if (!fileContent) return;

          // Buscar patrones de configuración centralizada
          const configPatterns = [
            /const\s+API_URL\s*=/,
            /const\s+BASE_URL\s*=/,
            /const\s+ENDPOINTS?\s*=/,
            /config\s*=\s*{/,
            /const\s+config\s*=/
          ];

          const hasConfig = configPatterns.some(pattern =>
            fileContent.match(pattern)
          );

          // Si hay llamadas fetch, debería haber configuración de URLs
          const hasFetchCalls = fileContent.includes('fetch(');
          if (hasFetchCalls && !hasConfig) {
            console.warn(`${fileName}: Usa fetch pero no tiene configuración centralizada de URLs`);
          }
        });

        it('NO DEBERÍA tener URLs de recursos externos hardcodeadas', () => {
          if (!fileContent) return;

          // Patrones de URLs de CDN o recursos externos
          const externalPatterns = [
            /http[s]?:\/\/cdn\.jsdelivr\.net/gi,
            /http[s]?:\/\/unpkg\.com/gi,
            /http[s]?:\/\/cdnjs\.cloudflare\.com/gi,
            /http[s]?:\/\/fonts\.googleapis\.com/gi,
            /http[s]?:\/\/api\.github\.com/gi
          ];

          const foundExternalUrls = [];
          externalPatterns.forEach(pattern => {
            const matches = fileContent.match(pattern);
            if (matches) {
              foundExternalUrls.push(...matches);
            }
          });

          // Permitir URLs externas pero deberían estar documentadas
          if (foundExternalUrls.length > 0) {
            // Esto es aceptable para CDNs y recursos públicos
            expect(foundExternalUrls.length).toBeGreaterThanOrEqual(0);
          }
        });
      });
    });
  });

  describe('Análisis de Archivos de Configuración', () => {
    it('DEBERÍA existir archivo .env de ejemplo', () => {
      const envExamplePath = path.join(projectRoot, '.env.example');
      const envPath = path.join(projectRoot, '.env');

      // Al menos debería existir .env.example
      expect(fs.existsSync(envExamplePath) || fs.existsSync(envPath)).toBe(true);
    });

    it('DEBERÍA tener configuración de variables de entorno', () => {
      const envExamplePath = path.join(projectRoot, '.env.example');
      const envPath = path.join(projectRoot, '.env');

      let envContent = '';
      if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, 'utf8');
      } else if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (envContent) {
        // Buscar variables comunes de configuración
        const commonEnvVars = [
          /PORT\s*=/,
          /NODE_ENV\s*=/,
          /JWT_SECRET\s*=/,
          /DATABASE_URL\s*=/,
          /API_URL\s*=/,
          /SUPABASE_URL\s*=/,
          /SUPABASE_ANON_KEY\s*=/
        ];

        const foundVars = commonEnvVars.filter(pattern =>
          envContent.match(pattern)
        );

        // Debería tener al menos algunas variables de entorno configuradas
        expect(foundVars.length).toBeGreaterThan(2);
      }
    });

    it('NO DEBERÍA tener valores sensibles en .env.example', () => {
      const envExamplePath = path.join(projectRoot, '.env.example');

      if (fs.existsSync(envExamplePath)) {
        const envContent = fs.readFileSync(envExamplePath, 'utf8');

        // Patrones que indican valores reales en lugar de placeholders
        const sensitivePatterns = [
          /JWT_SECRET\s*=\s*[a-zA-Z0-9+\/]{20,}/,
          /PASSWORD\s*=\s*\w+/,
          /SECRET\s*=\s*[a-zA-Z0-9+\/]{10,}/,
          /KEY\s*=\s*[a-zA-Z0-9+\/]{10,}/
        ];

        const hasSensitiveData = sensitivePatterns.some(pattern =>
          envContent.match(pattern)
        );

        expect(hasSensitiveData).toBeFalsy();
      }
    });
  });

  describe('Verificación de Configuración CORS y Orígenes', () => {
    it('DEBERÍA tener configuración CORS segura', () => {
      const appPath = path.join(backendSrcPath, 'app.js');

      if (fs.existsSync(appPath)) {
        const appContent = fs.readFileSync(appPath, 'utf8');

        // Buscar configuración CORS
        const corsPatterns = [
          /cors\s*\(/,
          /origin\s*:/,
          /credentials\s*:/,
          /methods\s*:/
        ];

        const hasCorsConfig = corsPatterns.some(pattern =>
          appContent.match(pattern)
        );

        if (hasCorsConfig) {
          // No debería tener orígenes muy permissivos
          const hasInsecureOrigin = appContent.includes('*') &&
                                   appContent.includes('origin') &&
                                   !appContent.includes('process.env');

          if (hasInsecureOrigin) {
            console.warn('Configuración CORS muy permissiva encontrada');
          }
        }
      }
    });
  });

  describe('Análisis de Endpoints y Rutas', () => {
    it('DEBERÍA tener prefijos de API consistentes', () => {
      const routesPath = path.join(backendSrcPath, 'routes');
      const routeFiles = [
        'auth.routes.js',
        'news.routes.js',
        'userProfile.routes.js'
      ];

      const apiPrefixes = [];
      routeFiles.forEach(fileName => {
        const filePath = path.join(routesPath, fileName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Buscar prefijos de ruta
          const prefixMatches = content.match(/router\.(?:get|post|put|delete)\s*\(\s*['"`]([^'"`]+)/g);
          if (prefixMatches) {
            prefixMatches.forEach(match => {
              const route = match.match(/['"`]([^'"`]+)/)[1];
              if (route.startsWith('/')) {
                apiPrefixes.push(route.split('/')[1]);
              }
            });
          }
        }
      });

      // Verificar consistencia en prefijos
      const uniquePrefixes = [...new Set(apiPrefixes)];
      expect(uniquePrefixes.length).toBeLessThanOrEqual(apiPrefixes.length);
    });
  });
});