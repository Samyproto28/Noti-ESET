import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Consistencia de Módulos ES6 - Simple', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const srcPath = path.join(projectRoot, 'src');

  describe('Configuración package.json', () => {
    it('debería tener "type": "module" configurado', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.type).toBe('module');
    });
  });

  describe('Detección de require en app.js', () => {
    it('app.js no debería tener require (ERROR CRÍTICO)', () => {
      const appPath = path.join(srcPath, 'app.js');
      const content = fs.readFileSync(appPath, 'utf8');

      // ESTA PRUEBA DEBERÍA FALLAR - Detectar el error específico
      expect(content).not.toMatch(/require\s*\(/);
      expect(content).not.toMatch(/const.*require/);
      expect(content).not.toMatch(/getPerformanceStats.*require/);
      expect(content).not.toMatch(/resetPerformanceStats.*require/);
    });

    it('app.js debería usar import para express', () => {
      const appPath = path.join(srcPath, 'app.js');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toMatch(/import\s+.*express.*from\s+/);
    });
  });

  describe('Detección de module.exports', () => {
    it('ningún archivo debería tener module.exports', () => {
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
        const relativePath = path.relative(srcPath, filePath);

        // NO debería tener module.exports
        expect(content).not.toMatch(/module\.exports/);
      }
    });
  });

  describe('Uso de export ES6', () => {
    it('archivos de rutas deberían tener export default', () => {
      const routesPath = path.join(srcPath, 'routes');
      const routeFiles = fs.readdirSync(routesPath).filter(file => file.endsWith('.js'));

      for (const routeFile of routeFiles) {
        const filePath = path.join(routesPath, routeFile);
        const content = fs.readFileSync(filePath, 'utf8');

        // Debería tener export default
        expect(content).toMatch(/export\s+default/);
      }
    });

    it('archivos de servicios deberían tener export nombrados', () => {
      const servicesPath = path.join(srcPath, 'services');

      if (fs.existsSync(servicesPath)) {
        const serviceFiles = fs.readdirSync(servicesPath).filter(file => file.endsWith('.js'));

        for (const serviceFile of serviceFiles) {
          const filePath = path.join(servicesPath, serviceFile);
          const content = fs.readFileSync(filePath, 'utf8');

          // Debería tener export nombrados
          expect(content).toMatch(/export\s+\{[^}]+\}/);
        }
      }
    });
  });

  describe('Importaciones consistentes', () => {
    it('debería usar import en lugar de require', () => {
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
        const relativePath = path.relative(srcPath, filePath);

        // NO debería tener require
        if (content.includes('require')) {
          console.log(`Archivo con require encontrado: ${relativePath}`);
        }
        expect(content).not.toMatch(/require\s*\(/);
      }
    });
  });
});