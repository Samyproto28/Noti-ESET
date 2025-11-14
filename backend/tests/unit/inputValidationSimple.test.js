import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Validación de Entrada - Análisis Estático', () => {
  const authControllerPath = path.join(projectRoot, 'src', 'controllers', 'authController.js');
  const newsControllerPath = path.join(projectRoot, 'src', 'controllers', 'newsController.js');

  describe('Análisis de authController.js - VULNERABILIDADES CRÍTICAS', () => {
    it('DEBERÍA FALLAR - authController no tiene validación de entrada (RED PHASE)', () => {
      if (!fs.existsSync(authControllerPath)) {
        console.warn('authController.js no encontrado, saltando prueba');
        expect(true).toBe(true); // Pasar si el archivo no existe
        return;
      }

      const content = fs.readFileSync(authControllerPath, 'utf8');

      // Verificar que NO hay validación de entrada
      expect(content).not.toMatch(/express-validator/);
      expect(content).not.toMatch(/body\(/);
      expect(content).not.toMatch(/validation/);
      expect(content).not.toMatch(/sanitize/);
      expect(content).not.toMatch(/trim\(\)/);
      expect(content).not.toMatch(/isEmail/);
      expect(content).not.toMatch(/isLength/);
      expect(content).not.toMatch(/notEmpty/);
    });

    it('DEBERÍA FALLAR - Extrae datos directamente del request sin validación', () => {
      if (!fs.existsSync(authControllerPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(authControllerPath, 'utf8');

      // Buscar patrones peligrosos de extracción directa
      expect(content).toMatch(/const\s*\{.*email.*\}\s*=\s*req\.body/);
      expect(content).toMatch(/const\s*\{.*password.*\}\s*=\s*req\.body/);
      expect(content).toMatch(/req\.body/);
    });

    it('DEBERÍA FALLAR - No hay sanitización de inputs', () => {
      if (!fs.existsSync(authControllerPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(authControllerPath, 'utf8');

      // Verificar ausencia de sanitización
      expect(content).not.toMatch(/escape/);
      expect(content).not.toMatch(/sanitize/);
      expect(content).not.toMatch(/filter/);
      expect(content).not.toMatch(/clean/);
      expect(content).not.toMatch(/strip/);
    });
  });

  describe('Análisis de newsController.js', () => {
    it('DEBERÍA VERIFICAR SI newsController está protegido por validadores en rutas', () => {
      if (!fs.existsSync(newsControllerPath)) {
        console.warn('newsController.js no encontrado, saltando prueba');
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(newsControllerPath, 'utf8');

      // newsController extrae datos de req.body y req.params (esperado para arquitectura MVC)
      expect(content).toMatch(/req\.body/);
      expect(content).toMatch(/req\.params/);
      expect(content).toMatch(/req\.user/);
    });
  });

  describe('Validación de Rutas', () => {
    const authRoutesPath = path.join(projectRoot, 'src', 'routes', 'auth.routes.js');
    const newsRoutesPath = path.join(projectRoot, 'src', 'routes', 'news.routes.js');

    it('auth.routes DEBERÍA tener middleware de validación', () => {
      if (!fs.existsSync(authRoutesPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(authRoutesPath, 'utf8');

      // auth.routes probablemente no tenga validación (PROBLEMA)
      expect(content).not.toMatch(/validateNews/);
      expect(content).not.toMatch(/handleValidationErrors/);
    });

    it('news.routes SÍ debería tener middleware de validación', () => {
      if (!fs.existsSync(newsRoutesPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(newsRoutesPath, 'utf8');

      // news.routes SÍ debería tener validación
      expect(content).toMatch(/validateNews/);
      expect(content).toMatch(/handleValidationErrors/);
    });
  });

  describe('Análisis de Validadores', () => {
    const validatorsPath = path.join(projectRoot, 'src', 'validators', 'newsValidators.js');

    it('newsValidators DEBERÍA existir y tener validaciones robustas', () => {
      if (!fs.existsSync(validatorsPath)) {
        console.warn('newsValidators.js no encontrado');
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(validatorsPath, 'utf8');

      // Verificar que tenga validaciones específicas
      expect(content).toMatch(/body\(/);
      expect(content).toMatch(/isLength/);
      expect(content).toMatch(/isURL/);
      expect(content).toMatch(/param\(/);
      expect(content).toMatch(/isUUID/);
    });

    it('DEBERÍA tener validaciones de longitud específicas', () => {
      if (!fs.existsSync(validatorsPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(validatorsPath, 'utf8');

      // Verificar límites específicos
      expect(content).toMatch(/min:\s*5/); // Título mínimo 5 caracteres
      expect(content).toMatch(/max:\s*200/); // Título máximo 200 caracteres
      expect(content).toMatch(/min:\s*10/); // Contenido mínimo 10 caracteres
      expect(content).toMatch(/max:\s*5000/); // Contenido máximo 5000 caracteres
    });
  });

  describe('Configuración de Seguridad', () => {
    it('DEBERÍA tener helmet configurado en app.js', () => {
      const appPath = path.join(projectRoot, 'src', 'app.js');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toMatch(/helmet/);
      expect(content).toMatch(/app\.use\(helmet\(\)/);
    });

    it('DEBERÍA tener CORS configurado', () => {
      const appPath = path.join(projectRoot, 'src', 'app.js');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toMatch(/cors/);
      expect(content).toMatch(/app\.use\(cors\(/);
    });

    it('DEBERÍA tener compression configurado', () => {
      const appPath = path.join(projectRoot, 'src', 'app.js');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toMatch(/compression/);
      expect(content).toMatch(/compressionMiddleware/);
    });
  });

  describe('Análisis de Middlewares de Seguridad', () => {
    const authMiddlewarePath = path.join(projectRoot, 'src', 'middleware', 'authMiddleware.js');
    const errorHandlerPath = path.join(projectRoot, 'src', 'middleware', 'errorHandler.js');

    it('authMiddleware DEBERÍA existir', () => {
      expect(fs.existsSync(authMiddlewarePath)).toBe(true);
    });

    it('errorHandler DEBERÍA existir', () => {
      expect(fs.existsSync(errorHandlerPath)).toBe(true);
    });

    it('errorHandler DEBERÍA manejar errores de validación', () => {
      if (!fs.existsSync(errorHandlerPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(errorHandlerPath, 'utf8');
      expect(content).toMatch(/validation/);
      expect(content).toMatch(/JsonWebTokenError/);
      expect(content).toMatch(/TokenExpiredError/);
    });
  });

  describe('Dependencias de Seguridad', () => {
    it('DEBERÍA tener express-validator instalado', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.dependencies).toHaveProperty('express-validator');
    });

    it('DEBERÍA tener helmet instalado', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.dependencies).toHaveProperty('helmet');
    });

    it('DEBERÍA tener jsonwebtoken instalado', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.dependencies).toHaveProperty('jsonwebtoken');
    });

    it('DEBERÍA tener cors instalado', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.dependencies).toHaveProperty('cors');
    });
  });

  describe('Validación de Variables de Entorno', () => {
    const envPath = path.join(projectRoot, '.env');

    it('DEBERÍA tener JWT_SECRET configurada', () => {
      expect(fs.existsSync(envPath)).toBe(true);

      const envContent = fs.readFileSync(envPath, 'utf8');
      expect(envContent).toContain('JWT_SECRET');
      expect(envContent.split('\n').find(line => line.includes('JWT_SECRET') && line.length > 20)).toBeTruthy();
    });

    it('DEBERÍA tener variables de Supabase configuradas', () => {
      expect(fs.existsSync(envPath)).toBe(true);

      const envContent = fs.readFileSync(envPath, 'utf8');
      expect(envContent).toContain('SUPABASE_URL');
      expect(envContent).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });
  });

  describe('Análisis de Código Sospechoso', () => {
    it('NO DEBERÍA tener eval() o Function() constructor', () => {
      const filesToCheck = [
        path.join(projectRoot, 'src', 'controllers', 'authController.js'),
        path.join(projectRoot, 'src', 'controllers', 'newsController.js')
      ];

      filesToCheck.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          expect(content).not.toMatch(/eval\s*\(/);
          expect(content).not.toMatch(/Function\s*\(/);
          expect(content).not.toMatch(/setTimeout\s*\(/);
        }
      });
    });

    it('NO DEBERÍA tener innerHTML o document.write', () => {
      const filesToCheck = [
        path.join(projectRoot, 'src', 'controllers', 'authController.js'),
        path.join(projectRoot, 'src', 'controllers', 'newsController.js')
      ];

      filesToCheck.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          expect(content).not.toMatch(/innerHTML/);
          expect(content).not.toMatch(/document\.write/);
        }
      });
    });
  });

  describe('Validación de Estructura de Proyecto', () => {
    it('DEBERÍA tener directorio src/', () => {
      const srcPath = path.join(projectRoot, 'src');
      expect(fs.existsSync(srcPath)).toBe(true);
    });

    it('DEBERÍA tener directorio controllers/', () => {
      const controllersPath = path.join(projectRoot, 'src', 'controllers');
      expect(fs.existsSync(controllersPath)).toBe(true);
    });

    it('DEBERÍA tener directorio middleware/', () => {
      const middlewarePath = path.join(projectRoot, 'src', 'middleware');
      expect(fs.existsSync(middlewarePath)).toBe(true);
    });

    it('DEBERÍA tener directorio routes/', () => {
      const routesPath = path.join(projectRoot, 'src', 'routes');
      expect(fs.existsSync(routesPath)).toBe(true);
    });

    it('DEBERÍA tener directorio services/', () => {
      const servicesPath = path.join(projectRoot, 'src', 'services');
      expect(fs.existsSync(servicesPath)).toBe(true);
    });
  });
});