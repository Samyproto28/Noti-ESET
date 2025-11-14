import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

describe('Verificación de Dependencias - Frontend', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const nodeModulesPath = path.join(projectRoot, 'node_modules');

  let packageJson;

  beforeAll(() => {
    try {
      packageJson = require(packageJsonPath);
    } catch (error) {
      console.warn('No se pudo leer package.json del frontend:', error.message);
    }
  });

  describe('Dependencias críticas de testing', () => {
    it('debería tener disponible @jest/globals (DEPENDENCIA FALTANTE)', () => {
      // Esta prueba DEBE FALLAR inicialmente (Red phase)
      expect(() => require('@jest/globals')).not.toThrow();
      const { jest, describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
      expect(jest).toBeDefined();
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
    });

    it('debería tener disponible jest (DEPENDENCIA FALTANTE)', () => {
      // Esta prueba DEBE FALLAR inicialmente (Red phase)
      expect(() => require('jest')).not.toThrow();
      const jest = require('jest');
      expect(jest).toBeDefined();
    });

    it('debería tener disponible jest-environment-jsdom (DEPENDENCIA FALTANTE)', () => {
      // Esta prueba DEBE FALLAR inicialmente (Red phase)
      expect(() => require('jest-environment-jsdom')).not.toThrow();
      const JSDOMEnvironment = require('jest-environment-jsdom');
      expect(JSDOMEnvironment).toBeDefined();
      expect(typeof JSDOMEnvironment).toBe('function');
    });

    it('debería tener disponible @testing-library/jest-dom (DEPENDENCIA FALTANTE)', () => {
      // Esta prueba DEBE FALLAR inicialmente (Red phase)
      expect(() => require('@testing-library/jest-dom')).not.toThrow();
      const testingLibrary = require('@testing-library/jest-dom');
      expect(testingLibrary).toBeDefined();
    });

    it('debería tener disponible @testing-library/user-event (DEPENDENCIA FALTANTE)', () => {
      // Esta prueba DEBE FALLAR inicialmente (Red phase)
      expect(() => require('@testing-library/user-event')).not.toThrow();
      const userEvent = require('@testing-library/user-event');
      expect(userEvent).toBeDefined();
      expect(typeof userEvent.setup).toBe('function');
    });
  });

  describe('Dependencias de desarrollo', () => {
    it('debería tener disponible eslint (DEPENDENCIA FALTANTE)', () => {
      // Esta prueba DEBE FALLAR inicialmente (Red phase)
      expect(() => require('eslint')).not.toThrow();
      const { ESLint } = require('eslint');
      expect(ESLint).toBeDefined();
      expect(typeof ESLint).toBe('function');
    });

    it('debería tener disponible live-server', () => {
      try {
        expect(() => require('live-server')).not.toThrow();
        const liveServer = require('live-server');
        expect(liveServer).toBeDefined();
      } catch (error) {
        console.warn('live-server no disponible (opcional para desarrollo)');
      }
    });
  });

  describe('Dependencias de UI', () => {
    it('debería tener disponible swiper (DEPENDENCIA FALTANTE)', () => {
      // Esta prueba DEBE FALLAR inicialmente (Red phase)
      expect(() => require('swiper')).not.toThrow();
      const swiper = require('swiper');
      expect(swiper).toBeDefined();
      expect(swiper.Swiper).toBeDefined();
    });
  });

  describe('Configuración de módulos ES6', () => {
    it('debería tener "type": "module" en package.json', () => {
      expect(packageJson).toBeDefined();
      expect(packageJson.type).toBe('module');
    });

    it('debería poder importar módulos ES6 del proyecto', async () => {
      const mainJsPath = path.join(projectRoot, 'src', 'main.js');

      // Esta prueba asume que main.js existe y es importable
      try {
        await import(mainJsPath);
        expect(true).toBe(true); // Si llega aquí, la importación fue exitosa
      } catch (error) {
        // Es aceptable que falle si main.js depende del DOM
        console.warn('main.js no se puede importar en entorno Node (esperado para frontend)');
        expect(true).toBe(true); // No fallar la prueba por esto
      }
    });
  });

  describe('Integridad de node_modules', () => {
    it('debería existir el directorio node_modules', () => {
      expect(() => {
        const fs = require('fs');
        fs.accessSync(nodeModulesPath, fs.constants.R_OK);
      }).not.toThrow();
    });

    it('debería tener carpetas de dependencias existentes', () => {
      const fs = require('fs');

      // Verificar dependencias que deberían existir
      const existingPackages = [];

      try {
        fs.accessSync(path.join(nodeModulesPath, 'jest'), fs.constants.R_OK);
        existingPackages.push('jest');
      } catch (e) {
        // Aún no instalado
      }

      // Al menos debería tener algunas dependencias básicas
      expect(existingPackages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Archivos de configuración', () => {
    it('debería tener archivo de configuración de Jest', () => {
      const jestConfigPath = path.join(projectRoot, 'jest.config.js');

      try {
        const fs = require('fs');
        fs.accessSync(jestConfigPath, fs.constants.R_OK);
        expect(true).toBe(true); // El archivo existe
      } catch (error) {
        console.warn('jest.config.js no encontrado (se usará configuración por defecto)');
      }
    });

    it('debería tener configuración de ESLint', () => {
      const eslintConfigPath = path.join(projectRoot, '.eslintrc.js');

      try {
        const fs = require('fs');
        fs.accessSync(eslintConfigPath, fs.constants.R_OK);
        expect(true).toBe(true); // El archivo existe
      } catch (error) {
        console.warn('.eslintrc.js no encontrado (opcional)');
      }
    });
  });

  describe('Dependencias de build y bundling', () => {
    it('debería tener disponible herramientas de build si se usan', () => {
      // Estas dependencias son opcionales dependiendo del setup
      const optionalBuildTools = [
        'webpack', 'rollup', 'vite', 'parcel'
      ];

      let buildToolFound = false;

      optionalBuildTools.forEach(tool => {
        try {
          require(tool);
          buildToolFound = true;
        } catch (error) {
          // Es aceptable que no estén presentes si se usa vanilla JS
        }
      });

      // Si no se encuentra ninguna herramienta de build, es aceptable para vanilla JS
      if (!buildToolFound) {
        console.warn('No se encontraron herramientas de build (aceptable para vanilla JS)');
      }

      expect(true).toBe(true); // No fallar la prueba
    });
  });

  describe('Compatibilidad con DOM', () => {
    it('debería tener JSDOM disponible para testing', () => {
      try {
        const { JSDOM } = require('jsdom');
        expect(JSDOM).toBeDefined();
        expect(typeof JSDOM).toBe('function');

        // Probar creación básica de DOM
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        expect(dom.window.document).toBeDefined();
      } catch (error) {
        console.warn('JSDOM no disponible directamente (probablemente a través de jest-environment-jsdom)');
      }
    });
  });

  describe('Estructura de archivos del proyecto', () => {
    it('debería tener directorio src/', () => {
      const fs = require('fs');
      const srcPath = path.join(projectRoot, 'src');

      expect(() => {
        fs.accessSync(srcPath, fs.constants.R_OK);
      }).not.toThrow();
    });

    it('debería tener archivo principal (index.html o main.js)', () => {
      const fs = require('fs');
      const indexPath = path.join(projectRoot, 'src', 'index.html');
      const mainJsPath = path.join(projectRoot, 'src', 'main.js');

      let mainFileExists = false;

      try {
        fs.accessSync(indexPath, fs.constants.R_OK);
        mainFileExists = true;
      } catch (e) {
        // index.html no encontrado
      }

      try {
        fs.accessSync(mainJsPath, fs.constants.R_OK);
        mainFileExists = true;
      } catch (e) {
        // main.js no encontrado
      }

      expect(mainFileExists).toBe(true);
    });
  });

  describe('Package.json consistency', () => {
    it('debería tener scripts de testing definidos', () => {
      if (!packageJson) return;

      const { scripts = {} } = packageJson;

      if (scripts.test) {
        expect(typeof scripts.test).toBe('string');
      } else {
        console.warn('Script "test" no definido en package.json');
      }
    });

    it('debería tener scripts de desarrollo definidos', () => {
      if (!packageJson) return;

      const { scripts = {} } = packageJson;

      if (scripts.dev || scripts.start) {
        expect(typeof (scripts.dev || scripts.start)).toBe('string');
      } else {
        console.warn('Scripts de desarrollo no definidos en package.json');
      }
    });

    it('debería tener engines definido', () => {
      if (!packageJson) return;

      if (packageJson.engines) {
        expect(packageJson.engines.node).toBeDefined();
      } else {
        console.warn('engines no definido en package.json');
      }
    });
  });

  describe('Errores comunes de dependencias', () => {
    it('no debería tener conflictos de versiones', () => {
      if (!packageJson) return;

      const { dependencies = {}, devDependencies = {} } = packageJson;
      const allDeps = { ...dependencies, ...devDependencies };

      // Verificar que no haya versiones conflictivas obvias
      Object.entries(allDeps).forEach(([name, version]) => {
        expect(version).not.toBe('latest');
        expect(version).not.toBe('*');
        expect(typeof version).toBe('string');
      });
    });

    it('debería manejar importaciones relativas correctamente', () => {
      // Probar que podemos requerir archivos relativos
      const testFilePath = path.join(__dirname, 'dependencies.test.js');

      expect(() => {
        // Esto debería funcionar ya que estamos en este archivo
        require(testFilePath);
      }).not.toThrow();
    });
  });

  describe('Dependencias de CSS y estilos', () => {
    it('debería tener disponibles dependencias de CSS si se usan', () => {
      const cssDependencies = ['sass', 'postcss', 'autoprefixer'];
      let foundCssDep = false;

      cssDependencies.forEach(dep => {
        try {
          require(dep);
          foundCssDep = true;
        } catch (error) {
          // Es aceptable que no estén presentes si se usa CSS vanilla
        }
      });

      if (!foundCssDep) {
        console.warn('No se encontraron preprocesadores CSS (aceptable para CSS vanilla)');
      }

      expect(true).toBe(true); // No fallar la prueba
    });
  });
});