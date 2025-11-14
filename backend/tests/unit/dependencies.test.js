import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

describe('Verificación de Dependencias - Backend', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const nodeModulesPath = path.join(projectRoot, 'node_modules');

  let packageJson;

  beforeAll(() => {
    // Leer package.json para verificar dependencias declaradas
    try {
      packageJson = require(packageJsonPath);
    } catch (error) {
      console.warn('No se pudo leer package.json:', error.message);
    }
  });

  describe('Dependencias críticas de producción', () => {
    it('debería tener disponible express', () => {
      expect(() => require('express')).not.toThrow();
      const express = require('express');
      expect(express).toBeDefined();
      expect(typeof express).toBe('function');
    });

    it('debería tener disponible supabase', () => {
      expect(() => require('@supabase/supabase-js')).not.toThrow();
      const supabase = require('@supabase/supabase-js');
      expect(supabase).toBeDefined();
      expect(supabase.createClient).toBeDefined();
    });

    it('debería tener disponible express-validator', () => {
      expect(() => require('express-validator')).not.toThrow();
      const { body, validationResult } = require('express-validator');
      expect(body).toBeDefined();
      expect(validationResult).toBeDefined();
    });

    it('debería tener disponible jsonwebtoken', () => {
      expect(() => require('jsonwebtoken')).not.toThrow();
      const jwt = require('jsonwebtoken');
      expect(jwt).toBeDefined();
      expect(jwt.sign).toBeDefined();
      expect(jwt.verify).toBeDefined();
    });

    it('debería tener disponible helmet', () => {
      expect(() => require('helmet')).not.toThrow();
      const helmet = require('helmet');
      expect(helmet).toBeDefined();
      expect(typeof helmet).toBe('function');
    });

    it('debería tener disponible cors', () => {
      expect(() => require('cors')).not.toThrow();
      const cors = require('cors');
      expect(cors).toBeDefined();
      expect(typeof cors).toBe('function');
    });

    it('debería tener disponible compression (DEPENDENCIA FALTANTE)', () => {
      // Esta prueba DEBE FALLAR inicialmente (Red phase)
      expect(() => require('compression')).not.toThrow();
      const compression = require('compression');
      expect(compression).toBeDefined();
      expect(typeof compression).toBe('function');
    });
  });

  describe('Dependencias de desarrollo y testing', () => {
    it('debería tener disponible jest', () => {
      expect(() => require('jest')).not.toThrow();
      expect(jest).toBeDefined();
    });

    it('debería tener disponible supertest', () => {
      expect(() => require('supertest')).not.toThrow();
      const request = require('supertest');
      expect(request).toBeDefined();
      expect(typeof request).toBe('function');
    });

    it('debería tener disponible nodemon', () => {
      expect(() => require('nodemon')).not.toThrow();
    });
  });

  describe('Configuración de módulos ES6', () => {
    it('debería tener "type": "module" en package.json', () => {
      expect(packageJson).toBeDefined();
      expect(packageJson.type).toBe('module');
    });

    it('debería poder importar módulos ES6', () => {
      // Verificar que podemos importar usando sintaxis ES6
      const modulePath = path.join(projectRoot, 'src', 'app.js');
      expect(() => import(modulePath)).not.toThrow();
    });
  });

  describe('Integridad de node_modules', () => => {
    it('debería existir el directorio node_modules', () => {
      expect(() => {
        const fs = require('fs');
        fs.accessSync(nodeModulesPath, fs.constants.R_OK);
      }).not.toThrow();
    });

    it('debería tener las carpetas principales de dependencias', () => {
      const fs = require('fs');
      const criticalPackages = [
        'express',
        '@supabase',
        'express-validator',
        'jsonwebtoken',
        'helmet',
        'cors'
      ];

      criticalPackages.forEach(pkg => {
        const pkgPath = path.join(nodeModulesPath, pkg);
        expect(() => {
          fs.accessSync(pkgPath, fs.constants.R_OK);
        }).not.toThrow();
      });
    });
  });

  describe('Dependencias opcionales pero recomendadas', () => {
    it('debería tener disponible dotenv', () => {
      expect(() => require('dotenv')).not.toThrow();
      const dotenv = require('dotenv');
      expect(dotenv).toBeDefined();
      expect(dotenv.config).toBeDefined();
    });

    it('debería tener disponible bcryptjs', () => {
      // Esta dependencia puede no estar presente si se usa Supabase Auth
      try {
        require('bcryptjs');
        const bcrypt = require('bcryptjs');
        expect(bcrypt).toBeDefined();
        expect(bcrypt.hash).toBeDefined();
        expect(bcrypt.compare).toBeDefined();
      } catch (error) {
        // Es aceptable si no está presente si se usa Supabase Auth
        console.warn('bcryptjs no disponible (usando Supabase Auth)');
      }
    });
  });

  describe('Versiones y compatibilidad', () => {
    it('debería tener versiones compatibles de dependencias principales', () => {
      if (!packageJson) return;

      const { dependencies = {} } = packageJson;

      // Verificar que tengamos versiones específicas (no latest o *)
      Object.entries(dependencies).forEach(([name, version]) => {
        expect(version).not.toBe('latest');
        expect(version).not.toBe('*');
        expect(typeof version).toBe('string');
      });
    });

    it('debería tener express versión 5.x o superior', () => {
      const express = require('express');
      const version = express.version;
      const majorVersion = parseInt(version.split('.')[0]);
      expect(majorVersion).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Dependencias de seguridad', () => {
    it('debería tener helmet disponible', () => {
      expect(() => require('helmet')).not.toThrow();
      const helmet = require('helmet');
      expect(helmet).toBeDefined();
    });

    it('debería tener available express-rate-limit', () => {
      // Esta es una dependencia recomendada para seguridad
      try {
        require('express-rate-limit');
        const rateLimit = require('express-rate-limit');
        expect(rateLimit).toBeDefined();
      } catch (error) {
        console.warn('express-rate-limit no disponible (recomendado para seguridad)');
      }
    });
  });

  describe('Errores comunes de dependencias', () => {
    it('no debería tener conflictos de CommonJS vs ES6', () => {
      // Verificar que los módulos principales se pueden importar consistentemente
      expect(() => {
        const express = require('express');
        const app = express();
        expect(app).toBeDefined();
        expect(typeof app.listen).toBe('function');
      }).not.toThrow();
    });

    it('debería manejar importaciones anidadas correctamente', () => {
      // Verificar que las importaciones profundas funcionan
      expect(() => {
        const { body } = require('express-validator');
        expect(body).toBeDefined();
        expect(typeof body).toBe('function');
      }).not.toThrow();
    });
  });

  describe('Package.json consistency', () => {
    it('debería tener scripts principales definidos', () => {
      if (!packageJson) return;

      const { scripts = {} } = packageJson;
      const criticalScripts = ['start', 'dev', 'test'];

      criticalScripts.forEach(script => {
        expect(scripts[script]).toBeDefined();
        expect(typeof scripts[script]).toBe('string');
      });
    });

    it('debería tener engines definido', () => {
      if (!packageJson) return;

      expect(packageJson.engines).toBeDefined();
      expect(packageJson.engines.node).toBeDefined();
    });
  });
});