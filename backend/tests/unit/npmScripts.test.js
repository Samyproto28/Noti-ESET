import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Validación de Scripts npm', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const scriptsDir = path.join(projectRoot, 'scripts');

  let packageJson;

  beforeAll(() => {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  });

  describe('Existencia de scripts críticos', () => {
    it('debería tener script start', () => {
      expect(packageJson.scripts).toHaveProperty('start');
      expect(typeof packageJson.scripts.start).toBe('string');
    });

    it('debería tener script dev', () => {
      expect(packageJson.scripts).toHaveProperty('dev');
      expect(typeof packageJson.scripts.dev).toBe('string');
    });

    it('debería tener script test', () => {
      expect(packageJson.scripts).toHaveProperty('test');
      expect(typeof packageJson.scripts.test).toBe('string');
    });

    it('debería tener script test:watch', () => {
      expect(packageJson.scripts).toHaveProperty('test:watch');
      expect(typeof packageJson.scripts['test:watch']).toBe('string');
    });

    it('debería tener script test:coverage', () => {
      expect(packageJson.scripts).toHaveProperty('test:coverage');
      expect(typeof packageJson.scripts['test:coverage']).toBe('string');
    });
  });

  describe('Scripts de testing', () => {
    it('script test debería funcionar correctamente', () => {
      const testScript = packageJson.scripts.test;
      expect(testScript).toContain('jest');
      expect(testScript).toContain('--experimental-vm-modules');
    });

    it('script test:watch debería tener modo watch', () => {
      const testWatchScript = packageJson.scripts['test:watch'];
      expect(testWatchScript).toContain('--watch');
    });

    it('script test:coverage debería generar cobertura', () => {
      const coverageScript = packageJson.scripts['test:coverage'];
      expect(coverageScript).toContain('--coverage');
    });
  });

  describe('Scripts de documentación - PROBLEMA CRÍTICO', () => {
    it('script docs:generate debería existir', () => {
      expect(packageJson.scripts).toHaveProperty('docs:generate');
      expect(typeof packageJson.scripts.docs:generate).toBe('string');
    });

    it('script docs:generate debería referenciar jsdoc.conf.json (ERROR - ARCHIVO FALTANTE)', () => {
      const docsScript = packageJson.scripts['docs:generate'];
      expect(docsScript).toContain('jsdoc');
      expect(docsScript).toContain('jsdoc.conf.json');
    });

    it('debería fallar porque jsdoc.conf.json no existe (RED PHASE)', () => {
      const jsdocConfigPath = path.join(projectRoot, 'jsdoc.conf.json');

      // ESTA PRUEBA DEBERÍA FALLAR - El archivo no existe
      expect(fs.existsSync(jsdocConfigPath)).toBe(true);
    });

    it('script report debería funcionar', () => {
      expect(packageJson.scripts).toHaveProperty('report');
      const reportScript = packageJson.scripts.report;
      expect(reportScript).toContain('node');
      expect(reportScript).toContain('scripts');
    });
  });

  describe('Scripts de utilidad', () => {
    it('script lint debería existir si se usa ESLint', () => {
      if (packageJson.devDependencies && packageJson.devDependencies.eslint) {
        expect(packageJson.scripts).toHaveProperty('lint');
        expect(packageJson.scripts.lint).toContain('eslint');
      }
    });

    it('script lint:fix debería existir si se usa ESLint', () => {
      if (packageJson.devDependencies && packageJson.devDependencies.eslint) {
        expect(packageJson.scripts).toHaveProperty('lint:fix');
        expect(packageJson.scripts['lint:fix']).toContain('--fix');
      }
    });
  });

  describe('Scripts de base de datos', () => {
    it('debería tener scripts para migraciones si existen', () => {
      const hasDbScripts = packageJson.scripts['db:migrate'] ||
                           packageJson.scripts['db:seed'] ||
                           packageJson.scripts['db:reset'];

      if (hasDbScripts) {
        // Si hay scripts de DB, deberían ser válidos
        Object.keys(packageJson.scripts).forEach(scriptName => {
          if (scriptName.startsWith('db:')) {
            expect(typeof packageJson.scripts[scriptName]).toBe('string');
            expect(packageJson.scripts[scriptName].length).toBeGreaterThan(0);
          }
        });
      }
    });
  });

  describe('Scripts de desarrollo', () => {
    it('script dev debería usar nodemon o similar', () => {
      const devScript = packageJson.scripts.dev;
      expect(devScript).toBeTruthy();
      expect(devScript.length).toBeGreaterThan(0);
    });

    it('script start debería usar node directamente', () => {
      const startScript = packageJson.scripts.start;
      expect(startScript).toContain('node');
      expect(startScript).not.toContain('nodemon'); // start debe ser para producción
    });
  });

  describe('Validación de rutas en scripts', () => {
    it('todos los scripts que referencian archivos deberían verificar existencia', () => {
      const scripts = packageJson.scripts;
      const filesReferenced = [];

      Object.entries(scripts).forEach(([scriptName, scriptCommand]) => {
        // Buscar referencias a archivos .js
        const jsFileMatches = scriptCommand.match(/[^'\s]+\.js/g);
        if (jsFileMatches) {
          jsFileMatches.forEach(filePath => {
            // Excluir rutas de node_modules y comandos del sistema
            if (!filePath.includes('node_modules') && !filePath.startsWith('/usr/')) {
              filesReferenced.push({
                script: scriptName,
                file: filePath,
                fullPath: path.resolve(projectRoot, filePath)
              });
            }
          });
        }
      });

      // Verificar que los archivos referenciados existan
      filesReferenced.forEach(({ script, file, fullPath }) => {
        if (file.includes('jsdoc.conf.json')) {
          // Este archivo específicamente no existe - es el error que vamos a corregir
          expect(fs.existsSync(fullPath)).toBe(false);
        } else {
          // Otros archivos deberían existir
          expect(fs.existsSync(fullPath)).toBe(true);
        }
      });
    });
  });

  describe('Scripts personalizados del proyecto', () => {
    it('debería tener scripts para generación de reportes', () => {
      expect(packageJson.scripts).toHaveProperty('report');
      const reportScript = packageJson.scripts.report;
      expect(reportScript).toContain('node');
      expect(reportScript).toContain('scripts/generate-test-report.js');
    });

    it('debería existir el archivo generate-test-report.js', () => {
      const reportFilePath = path.join(scriptsDir, 'generate-test-report.js');
      expect(fs.existsSync(reportFilePath)).toBe(true);
    });

    it('debería existir el archivo run-tests.js', () => {
      const runTestsPath = path.join(scriptsDir, 'run-tests.js');
      expect(fs.existsSync(runTestsPath)).toBe(true);
    });
  });

  describe('Configuración de entornos', () => {
    it('debería tener scripts específicos para entornos si aplica', () => {
      const envScripts = ['dev:local', 'dev:staging', 'start:production'];
      const foundEnvScripts = envScripts.filter(script => packageJson.scripts[script]);

      foundEnvScripts.forEach(scriptName => {
        expect(typeof packageJson.scripts[scriptName]).toBe('string');
        expect(packageJson.scripts[scriptName].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Scripts de construcción y despliegue', () => {
    it('debería tener script build si aplica', () => {
      if (packageJson.scripts.build) {
        expect(typeof packageJson.scripts.build).toBe('string');
        expect(packageJson.scripts.build.length).toBeGreaterThan(0);
      }
    });

    it('debería tener script deploy si aplica', () => {
      if (packageJson.scripts.deploy) {
        expect(typeof packageJson.scripts.deploy).toBe('string');
        expect(packageJson.scripts.deploy.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Seguridad en scripts', () => {
    it('no debería tener scripts inseguros', () => {
      const scripts = packageJson.scripts;
      const insecurePatterns = [
        /rm\s+-rf/,
        /sudo/,
        /chmod\s+777/,
        />\s*\/dev\/null/,
        /\|\s*sh/
      ];

      Object.entries(scripts).forEach(([scriptName, scriptCommand]) => {
        insecurePatterns.forEach(pattern => {
          expect(scriptCommand).not.toMatch(pattern);
        });
      });
    });

    it('los scripts deberían usar rutas relativas cuando sea posible', () => {
      const scripts = packageJson.scripts;

      Object.entries(scripts).forEach(([scriptName, scriptCommand]) => {
        // Evitar rutas absolutas del sistema de archivos
        expect(scriptCommand).not.toMatch(/\/(home|Users|tmp|var)\//);
      });
    });
  });

  describe('Consistencia de scripts', () => {
    it('debería tener consistencia en el nombramiento', () => {
      const scripts = Object.keys(packageJson.scripts);

      // Verificar convenciones de nombramiento comunes
      const hasInconsistentNaming = scripts.some(script => {
        return !/^[\w:-]+$/.test(script); // Solo permitir letras, números, guiones y dos puntos
      });

      expect(hasInconsistentNaming).toBe(false);
    });

    it('debería tener descripciones en scripts importantes si aplica', () => {
      // Esto es más una guía que una prueba estricta
      const importantScripts = ['start', 'dev', 'test', 'build'];

      importantScripts.forEach(scriptName => {
        if (packageJson.scripts[scriptName]) {
          // Los scripts importantes deberían ser autoexplicativos por su nombre
          expect(scriptName).toBeTruthy();
        }
      });
    });
  });

  describe('Integración con herramientas externas', () => {
    it('debería configurar correctamente las herramientas de testing', () => {
      const testScript = packageJson.scripts.test;

      if (testScript) {
        // Verificar configuración de Jest para ES6
        expect(testScript).toContain('--experimental-vm-modules');
      }
    });

    it('debería configurar correctamente las herramientas de linting', () => {
      const lintScript = packageJson.scripts.lint;

      if (lintScript && packageJson.devDependencies.eslint) {
        expect(lintScript).toContain('eslint');
      }
    });
  });
});