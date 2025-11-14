import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Validación de Scripts npm - Simple', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  let packageJson;

  beforeAll(() => {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  });

  describe('Script docs:generate - ERROR CRÍTICO', () => {
    it('debería tener script docs:generate', () => {
      expect(packageJson.scripts).toHaveProperty('docs:generate');
    });

    it('script docs:generate debería referenciar jsdoc.conf.json', () => {
      const docsScript = packageJson.scripts['docs:generate'];
      expect(docsScript).toContain('jsdoc');
      expect(docsScript).toContain('jsdoc.conf.json');
    });

    it('DEBERÍA FALLAR - jsdoc.conf.json no existe (RED PHASE)', () => {
      const jsdocConfigPath = path.join(projectRoot, 'jsdoc.conf.json');

      // ESTA PRUEBA DEBERÍA FALLAR - El archivo no existe
      expect(fs.existsSync(jsdocConfigPath)).toBe(true);
    });
  });

  describe('Otros scripts importantes', () => {
    it('debería tener script test', () => {
      expect(packageJson.scripts).toHaveProperty('test');
      expect(typeof packageJson.scripts.test).toBe('string');
    });

    it('debería tener script start', () => {
      expect(packageJson.scripts).toHaveProperty('start');
      expect(typeof packageJson.scripts.start).toBe('string');
    });

    it('debería tener script dev', () => {
      expect(packageJson.scripts).toHaveProperty('dev');
      expect(typeof packageJson.scripts.dev).toBe('string');
    });

    it('debería tener script report', () => {
      expect(packageJson.scripts).toHaveProperty('report');
      expect(typeof packageJson.scripts.report).toBe('string');
    });
  });

  describe('Archivos referenciados por scripts', () => {
    it('scripts/run-tests.js debería existir', () => {
      const runTestsPath = path.join(projectRoot, 'scripts', 'run-tests.js');
      expect(fs.existsSync(runTestsPath)).toBe(true);
    });

    it('scripts/generate-test-report.js debería existir', () => {
      const reportPath = path.join(projectRoot, 'scripts', 'generate-test-report.js');
      expect(fs.existsSync(reportPath)).toBe(true);
    });
  });

  describe('Configuración de scripts', () => {
    it('scripts deberían usar rutas relativas', () => {
      const scripts = packageJson.scripts;

      Object.values(scripts).forEach(scriptCommand => {
        // Verificar que no haya rutas absolutas del sistema
        expect(scriptCommand).not.toMatch(/\/(home|Users|tmp|var)\//);
      });
    });

    it('scripts importantes deberían existir', () => {
      const criticalScripts = ['start', 'test', 'dev'];

      criticalScripts.forEach(scriptName => {
        expect(packageJson.scripts).toHaveProperty(scriptName);
        expect(packageJson.scripts[scriptName].length).toBeGreaterThan(0);
      });
    });
  });
});