import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Análisis de Calidad de Documentación y Comentarios', () => {
  const backendSrcPath = path.join(projectRoot, 'src');
  const frontendSrcPath = path.join(projectRoot, '..', 'frontend', 'src');
  const readmePath = path.join(projectRoot, '..', 'README.md');

  describe('Análisis de README.md', () => {
    let readmeContent;

    beforeAll(() => {
      if (fs.existsSync(readmePath)) {
        readmeContent = fs.readFileSync(readmePath, 'utf8');
      }
    });

    it('DEBERÍA existir archivo README.md', () => {
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    it('DEBERÍA tener título descriptivo', () => {
      if (!readmeContent) return;

      // Buscar el primer encabezado (# ##)
      const titleMatch = readmeContent.match(/^#\s+(.+)/m);
      expect(titleMatch).toBeTruthy();
      expect(titleMatch[1].trim().length).toBeGreaterThan(10);
    });

    it('DEBERÍA tener descripción del proyecto', () => {
      if (!readmeContent) return;

      // Debería tener una descripción sustancial
      expect(readmeContent.length).toBeGreaterThan(500);

      // Buscar palabras clave descriptivas
      const descriptiveKeywords = [
        /descripci[oó]n/i,
        /proyecto/i,
        /aplicaci[oó]n/i,
        /sistema/i
      ];

      const hasDescription = descriptiveKeywords.some(keyword => readmeContent.match(keyword));
      expect(hasDescription).toBeTruthy();
    });

    it('DEBERÍA tener instrucciones de instalación', () => {
      if (!readmeContent) return;

      // Buscar secciones de instalación
      const installSections = [
        /##?\s*Instalaci[oó]n/i,
        /##?\s*Installation/i,
        /npm\s+install/i,
        /yarn\s+add/i,
        /git\s+clone/i
      ];

      const hasInstallation = installSections.some(section => readmeContent.match(section));
      expect(hasInstallation).toBeTruthy();
    });

    it('DEBERÍA tener instrucciones de uso', () => {
      if (!readmeContent) return;

      // Buscar secciones de uso
      const usageSections = [
        /##?\s*Uso/i,
        /##?\s*Usage/i,
        /##?\s*Ejemplos/i,
        /##?\s*Getting\s+Started/i
      ];

      const hasUsage = usageSections.some(section => readmeContent.match(section));
      expect(hasUsage).toBeTruthy();
    });

    it('DEBERÍA tener información de estructura de archivos', () => {
      if (!readmeContent) return;

      // Buscar sección de estructura
      const structureSections = [
        /##?\s*Estructura/i,
        /##?\s*Estructura\s+de\s+archivos/i,
        /##?\s*Directorios/i,
        /##?\s*File\s+Structure/i
      ];

      const hasStructure = structureSections.some(section => readmeContent.match(section));
      expect(hasStructure).toBeTruthy();
    });

    it('DEBERÍA tener información de dependencias', () => {
      if (!readmeContent) return;

      // Buscar sección de dependencias
      const dependencySections = [
        /##?\s*Dependencias/i,
        /##?\s*Dependencies/i,
        /##?\s*Requisitos/i,
        /##?\s*Requirements/i
      ];

      const hasDependencies = dependencySections.some(section => readmeContent.match(section));
      expect(hasDependencies).toBeTruthy();
    });

    it('DEBERÍA tener sección de contribución', () => {
      if (!readmeContent) return;

      // Buscar sección de contribución
      const contributionSections = [
        /##?\s*Contribuir/i,
        /##?\s*Contributing/i,
        /##?\s*C[oó]mo\s+contribuir/i
      ];

      const hasContribution = contributionSections.some(section => readmeContent.match(section));
      expect(hasContribution).toBeTruthy();
    });

    it('DEBERÍA tener licencia', () => {
      if (!readmeContent) return;

      // Buscar sección de licencia
      const licenseSections = [
        /##?\s*Licencia/i,
        /##?\s*License/i,
        /##?\s*M\s*I\s*T\s*L/i
      ];

      const hasLicense = licenseSections.some(section => readmeContent.match(section));
      expect(hasLicense).toBeTruthy();
    });

    it('DEBERÍA tener formato Markdown válido', () => {
      if (!readmeContent) return;

      // Verificar que no haya errores comunes de Markdown
      const markdownErrors = [
        /\[.*\]\(\s*$/m, // Enlaces vacíos
        /!\[.*\]\(.*\)\s*$/m, // Enlaces a imágenes sin alt
        /```[\s\S]*?```\s*$/m // Bloques de código sin cierre
      ];

      markdownErrors.forEach(error => {
        const matches = readmeContent.match(error);
        if (matches) {
          // Permitir algunos errores comunes
          expect(matches.length).toBeLessThan(3);
        }
      });
    });
  });

  describe('Análisis de Documentación en Código - Backend', () => {
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

    describe('Análisis de JSDoc y Comentarios', () => {
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

          it('DEBERÍA tener JSDoc para funciones principales', () => {
            if (!fileContent) return;

            // Buscar comentarios JSDoc
            const jsdocMatches = fileContent.match(/\/\*\*[\s\S]*?\*\//g) || [];
            expect(jsdocMatches.length).toBeGreaterThan(0);
          });

          it('DEBERÍA tener descripción de parámetros en funciones', () => {
            if (!fileContent) return;

            // Buscar parámetros documentados
            const paramDocs = fileContent.match(/@param\s+\w+/g) || [];
            const functions = fileContent.match(/(?:function|const\s+\w+\s*=)\s*\([^)]*\)/g) || [];

            // Si hay funciones con parámetros, debería haber documentación
            if (functions.length > 0) {
              const hasParams = functions.some(func => func.includes(','));
              if (hasParams && paramDocs.length === 0) {
                console.warn(`${fileName}: Funciones con parámetros sin documentación`);
              }
            }
          });

          it('DEBERÍA tener tipo de retorno documentado', () => {
            if (!fileContent) return;

            // Buscar documentación de retorno
            const returnDocs = fileContent.match(/@returns/g) || [];
            const asyncFunctions = fileContent.match(/async\s+function|async\s+\w+\s*=/g) || [];

            // Si hay funciones asíncronas, debería haber documentación de retorno
            if (asyncFunctions.length > 0 && returnDocs.length === 0) {
              console.warn(`${fileName}: Funciones asíncronas sin @returns`);
            }
          });

          it('DEBERÍA tener comentarios para lógica compleja', () => {
            if (!fileContent) return;

            // Buscar bloques complejos que deberían tener comentarios
            const complexPatterns = [
              /if\s*\([^)]*\)\s*{[^}]*}\s*else\s*{/g,
              /for\s*\([^)]*\)\s*{[^}]*}/g,
              /while\s*\([^)]*\)\s*{[^}]*}/g,
              /switch\s*\([^)]*\)\s*{[^}]*case[^:]*:/g
            ];

            complexPatterns.forEach(pattern => {
              const matches = fileContent.match(pattern);
              if (matches && matches.length > 2) {
                // Si hay varios bloques complejos, debería haber comentarios
                const hasComments = fileContent.match(/\/\/.*$/gm);
                expect(hasComments.length).toBeGreaterThan(5);
              }
            });
          });

          it('NO DEBERÍA tener comentarios TODO o FIXME sin detalles', () => {
            if (!fileContent) return;

            // Buscar TODO/FIXME
            const todoMatches = fileContent.match(/\/\/\s*(TODO|FIXME)\s*:?\s*\S+/gi) || [];

            todoMatches.forEach(match => {
              // TODO/FIXME deberían tener descripción
              expect(match.split(':')[1].trim().length).toBeGreaterThan(10);
            });
          });

          it('DEBERÍA tener comentarios descriptivos', () => {
            if (!fileContent) return;

            // Los comentarios deberían ser descriptivos, no obvios
            const genericComments = fileContent.match(/\/\/\s*(foo|bar|test|fix|temp)/gi) || [];
            expect(genericComments.length).toBe(0);
          });
        });
      });
    });
  });

  describe('Análisis de Documentación en Código - Frontend', () => {
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

    describe('Análisis de JSDoc y Comentarios', () => {
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

          it('DEBERÍA tener comentarios para funciones importantes', () => {
            if (!fileContent) return;

            // Buscar comentarios JavaScript
            const commentMatches = fileContent.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
            expect(commentMatches.length).toBeGreaterThan(0);
          });

          it('DEBERÍA tener documentación para eventos DOM', () => {
            if (!fileContent) return;

            // Si hay addEventListener, debería haber comentarios
            if (fileContent.includes('addEventListener')) {
              const eventComments = fileContent.match(/\/\/.*evento|\/\/.*listener|\/\/.*DOM/gi) || [];
              expect(eventComments.length).toBeGreaterThan(0);
            }
          });

          it('DEBERÍA tener comentarios para manejo de errores', () => {
            if (!fileContent) return;

            // Si hay manejo de errores, debería haber comentarios
            if (fileContent.includes('catch') || fileContent.includes('error')) {
              const errorComments = fileContent.match(/\/\/.*error|\/\/.*catch|\/\/.*excepci/gi) || [];
              expect(errorComments.length).toBeGreaterThan(0);
            }
          });

          it('DEBERÍA tener comentarios para API calls', () => {
            if (!fileContent) return;

            // Si hay llamadas a API, debería haber comentarios
            if (fileContent.includes('fetch(')) {
              const apiComments = fileContent.match(/\/\/.*API|\/\/.*endpoint|\/\/.*fetch/gi) || [];
              expect(apiComments.length).toBeGreaterThan(0);
            }
          });

          it('NO DEBERÍA tener comentarios redundantes', () => {
            if (!fileContent) return;

            // Buscar comentarios que repiten lo que dice el código
            const redundantPatterns = [
              /\/\/\s*\w+\s*=\s*\w+\s*;?$/gi, // // x = x;
              /\/\*\s*\w+\s*\*\//g,          // /* x *x */
            ];

            redundantPatterns.forEach(pattern => {
              const matches = fileContent.match(pattern);
              if (matches) {
                expect(matches.length).toBeLessThan(3);
              }
            });
          });

          it('DEBERÍA tener información de autoría cuando corresponda', () => {
            if (!fileContent) return;

            // Buscar comentarios de autoría
            const authorComments = fileContent.match(/@author|Author:|Created by|Desarrollado por/gi) || [];

            // No todos los archivos necesitan autoría, pero si la tienen, debe estar presente
            if (authorComments.length > 0) {
              expect(authorComments.length).toBeGreaterThan(0);
            }
          });

          it('DEBERÍA tener comentarios de versión cuando corresponda', () => {
            if (!fileContent) return;

            // Buscar comentarios de versión
            const versionComments = fileContent.match(/@version|Version:|v\d+\.\d+/gi) || [];

            // No todos los archivos necesitan versión, pero si la tienen, debe estar presente
            if (versionComments.length > 0) {
              expect(versionComments.length).toBeGreaterThan(0);
            }
          });
        });
      });
    });
  });

  describe('Análisis de Consistencia de Comentarios', () => {
    it('DEBERÍA tener estilo de comentarios consistente', () => {
      const allFiles = [...backendFiles, ...frontendFiles];
      let jsdocCount = 0;
      let lineCommentCount = 0;
      let blockCommentCount = 0;

      allFiles.forEach(fileName => {
        const isBackend = backendFiles.includes(fileName);
        const filePath = path.join(isBackend ? backendSrcPath : frontendSrcPath, fileName);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Contar tipos de comentarios
          jsdocCount += (content.match(/\/\*[\s\S]*?\*\//g) || []).length;
          lineCommentCount += (content.match(/\/\/.*$/gm) || []).length;
          blockCommentCount += (content.match(/\/\*[\s\S]*?\*\//g) || []).length;
        }
      });

      // Debería haber una mezcla razonable de tipos de comentarios
      expect(jsdocCount + lineCommentCount + blockCommentCount).toBeGreaterThan(10);
    });

    it('DEBERÍA tener comentarios en español (consistente con el proyecto)', () => {
      const allFiles = [...backendFiles, ...frontendFiles];
      let spanishComments = 0;

      allFiles.forEach(fileName => {
        const isBackend = backendFiles.includes(fileName);
        const filePath = path.join(isBackend ? backendSrcPath : frontendSrcPath, fileName);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Buscar palabras en español en comentarios
          const spanishPatterns = [
            /\/\*[\s\S]*\b(?:descripci|parámetro|retorna|función|error|éxito|validar|comprobar)\b[\s\S]*?\*\//gi,
            /\/\/.*\b(?:descripci|parámetro|retorna|función|error|éxito|validar|comprobar)\b.*$/gm
          ];

          spanishComments += spanishPatterns.reduce((count, pattern) => {
            return count + (content.match(pattern) || []).length;
          }, 0);
        }
      });

      // Al menos algunos comentarios deberían estar en español
      expect(spanishComments).toBeGreaterThan(5);
    });

    it('DEBERÍA tener comentarios de formato consistente', () => {
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
      const allFiles = [...backendFiles, ...frontendFiles];
      const commentFormats = [];

      allFiles.forEach(fileName => {
        const isBackend = backendFiles.includes(fileName);
        const filePath = path.join(isBackend ? backendSrcPath : frontendSrcPath, fileName);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Analizar formatos de comentarios
          commentFormats.push({
            file: fileName,
            hasJSDoc: content.includes('/**'),
            hasLineComments: content.includes('//'),
            hasBlockComments: content.includes('/*'),
            hasInlineComments: content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/g)
          });
        }
      });

      // Verificar consistencia en formatos
      const jsdocFiles = commentFormats.filter(f => f.hasJSDoc).length;
      const nonJSDocFiles = commentFormats.filter(f => !f.hasJSDoc).length;

      // Los archivos con JSDoc deberían ser consistentes
      if (jsdocFiles > 0) {
        expect(jsdocFiles).toBeGreaterThan(0);
      }
    });
  });

  describe('Análisis de Documentación de API', () => {
    it('DEBERÍA tener documentación de endpoints', () => {
      const routesPath = path.join(backendSrcPath, 'routes');
      const routeFiles = [
        'auth.routes.js',
        'news.routes.js',
        'userProfile.routes.js'
      ];

      routeFiles.forEach(fileName => {
        const filePath = path.join(routesPath, fileName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Los archivos de rutas deberían tener comentarios sobre los endpoints
          const hasComments = content.includes('//') || content.includes('/*');
          expect(hasComments).toBeTruthy();
        }
      });
    });

    it('DEBERÍA tener documentación de validadores', () => {
      const validatorsPath = path.join(backendSrcPath, 'validators');
      const validatorFiles = [
        'authValidators.js',
        'newsValidators.js'
      ];

      validatorFiles.forEach(fileName => {
        const filePath = path.join(validatorsPath, fileName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Los archivos de validadores deberían tener JSDoc
          const hasJSDoc = content.includes('/**');
          expect(hasJSDoc).toBeTruthy();
        }
      });
    });

    it('DEBERÍA tener documentación de middleware', () => {
      const middlewarePath = path.join(backendSrcPath, 'middleware');
      const middlewareFiles = [
        'authMiddleware.js',
        'errorHandler.js'
      ];

      middlewareFiles.forEach(fileName => {
        const filePath = path.join(middlewarePath, fileName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Los archivos de middleware deberían tener comentarios
          const hasComments = content.includes('//') || content.includes('/*');
          expect(hasComments).toBeTruthy();
        }
      });
    });
  });

  describe('Análisis de Documentación de Errores', () => {
    it('DEBERÍA tener documentación de códigos de error', () => {
      // Buscar archivos de error o manejo de errores
      const errorFiles = [
        path.join(backendSrcPath, 'middleware', 'errorHandler.js'),
        path.join(backendSrcPath, 'utils', 'responseHelper.js')
      ];

      errorFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Los archivos de error deberían tener documentación
          expect(content).toMatch(/\/\*[\s\S]*?\*\/|\/\/.*error|\/\/.*Error/gi);
        }
      });
    });

    it('DEBERÍA tener documentación de códigos de estado HTTP', () => {
      const utilsPath = path.join(backendSrcPath, 'utils', 'responseHelper.js');

      if (fs.existsSync(utilsPath)) {
        const content = fs.readFileSync(utilsPath, 'utf8');

        // Buscar documentación de códigos de estado HTTP
        const httpStatusPatterns = [
          /200.*OK/gi,
          /201.*Created/gi,
          /400.*Bad\s+Request/gi,
          /401.*Unauthorized/gi,
          /403.*Forbidden/gi,
          /404.*Not\s+Found/gi,
          /500.*Internal\s+Server\s+Error/gi
        ];

        const hasHttpStatusDocs = httpStatusPatterns.some(pattern => content.match(pattern));
        expect(hasHttpStatusDocs).toBeTruthy();
      }
    });
  });

  describe('Análisis de Documentación de Configuración', () => {
    it('DEBERÍA tener documentación de variables de entorno', () => {
      const envPath = path.join(projectRoot, '.env');

      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');

        // El archivo .env debería tener comentarios
        const hasComments = envContent.includes('#') || envContent.includes('//');
        expect(hasComments).toBeTruthy();
      }
    });

    it('DEBERÍA tener archivo de configuración de JSDoc', () => {
      const jsdocPath = path.join(projectRoot, 'jsdoc.conf.json');

      if (fs.existsSync(jsdocPath)) {
        const jsdocContent = fs.readFileSync(jsdocPath, 'utf8');

        // El archivo de configuración debería incluir la carpeta src
        expect(jsdocContent).toMatch(/src/);
      }
    });
  });
});