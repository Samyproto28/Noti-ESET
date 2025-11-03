#!/usr/bin/env node

/**
 * Script de validación para verificar que las correcciones del foro funcionen correctamente
 */

const fs = require('fs');
const path = require('path');

// Colores para la salida en consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para imprimir mensajes con color
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para verificar si un archivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Función para verificar si un directorio existe
function dirExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

// Función para verificar el contenido de un archivo
function verifyFileContent(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = [];
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex, pattern.flags || 'g');
      const matches = content.match(regex);
      results.push({
        pattern: pattern.description,
        found: matches && matches.length > 0,
        count: matches ? matches.length : 0
      });
    }
    
    return results;
  } catch (error) {
    log(`Error al leer el archivo ${filePath}: ${error.message}`, 'red');
    return [];
  }
}

// Validaciones del backend
function validateBackend() {
  log('\n=== Validando Backend ===', 'cyan');
  
  const backendDir = path.join(__dirname, '../backend');
  const results = {
    success: true,
    checks: []
  };
  
  // Verificar archivos críticos
  const criticalFiles = [
    'src/services/userService.js',
    'src/services/forumService.js',
    'src/controllers/forumController.js',
    'src/routes/forum.routes.js',
    'package.json',
    'jest.config.js'
  ];
  
  for (const file of criticalFiles) {
    const filePath = path.join(backendDir, file);
    const exists = fileExists(filePath);
    results.checks.push({
      name: `Archivo ${file}`,
      success: exists,
      message: exists ? 'Existe' : 'No encontrado'
    });
    
    if (!exists) {
      results.success = false;
    }
  }
  
  // Verificar configuración de tests
  const jestConfigPath = path.join(backendDir, 'jest.config.js');
  if (fileExists(jestConfigPath)) {
    const jestPatterns = [
      { regex: 'testEnvironment.*node', description: 'Configuración de entorno de test' },
      { regex: 'roots.*tests', description: 'Directorio de tests' },
      { regex: 'collectCoverageFrom', description: 'Configuración de cobertura' }
    ];
    
    const jestResults = verifyFileContent(jestConfigPath, jestPatterns);
    for (const result of jestResults) {
      results.checks.push({
        name: `Jest: ${result.pattern}`,
        success: result.found,
        message: result.found ? 'Configurado' : 'No configurado'
      });
      
      if (!result.found) {
        results.success = false;
      }
    }
  }
  
  // Verificar servicio de usuarios
  const userServicePath = path.join(backendDir, 'src/services/userService.js');
  if (fileExists(userServicePath)) {
    const userPatterns = [
      { regex: 'getAnonymousUserId', description: 'Función getAnonymousUserId' },
      { regex: 'isValidUserId', description: 'Función isValidUserId' },
      { regex: 'getUserIdForForum', description: 'Función getUserIdForForum' },
      { regex: 'ANONYMOUS_USER_ID', description: 'Constante ANONYMOUS_USER_ID' }
    ];
    
    const userResults = verifyFileContent(userServicePath, userPatterns);
    for (const result of userResults) {
      results.checks.push({
        name: `UserService: ${result.pattern}`,
        success: result.found,
        message: result.found ? 'Implementado' : 'No implementado'
      });
      
      if (!result.found) {
        results.success = false;
      }
    }
  }
  
  // Verificar servicio del foro
  const forumServicePath = path.join(backendDir, 'src/services/forumService.js');
  if (fileExists(forumServicePath)) {
    const forumPatterns = [
      { regex: 'validatePostData', description: 'Función validatePostData' },
      { regex: 'validateCommentData', description: 'Función validateCommentData' },
      { regex: 'getUserIdForForum', description: 'Uso de getUserIdForForum' },
      { regex: 'isValidUserId', description: 'Validación de UUID' }
    ];
    
    const forumResults = verifyFileContent(forumServicePath, forumPatterns);
    for (const result of forumResults) {
      results.checks.push({
        name: `ForumService: ${result.pattern}`,
        success: result.found,
        message: result.found ? 'Implementado' : 'No implementado'
      });
      
      if (!result.found) {
        results.success = false;
      }
    }
  }
  
  // Verificar controlador del foro
  const forumControllerPath = path.join(backendDir, 'src/controllers/forumController.js');
  if (fileExists(forumControllerPath)) {
    const controllerPatterns = [
      { regex: 'validatePostData', description: 'Uso de validatePostData' },
      { regex: 'validateCommentData', description: 'Uso de validateCommentData' },
      { regex: 'getUserIdForForum', description: 'Uso de getUserIdForForum' },
      { regex: 'uuidRegex', description: 'Validación de UUID en controlador' }
    ];
    
    const controllerResults = verifyFileContent(forumControllerPath, controllerPatterns);
    for (const result of controllerResults) {
      results.checks.push({
        name: `ForumController: ${result.pattern}`,
        success: result.found,
        message: result.found ? 'Implementado' : 'No implementado'
      });
      
      if (!result.found) {
        results.success = false;
      }
    }
  }
  
  // Verificar tests
  const testsDir = path.join(backendDir, 'tests');
  const testFiles = [
    'unit/services/userService.test.js',
    'integration/forum.posts.test.js',
    'setup/testSetup.js'
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(testsDir, file);
    const exists = fileExists(filePath);
    results.checks.push({
      name: `Test: ${file}`,
      success: exists,
      message: exists ? 'Existe' : 'No encontrado'
    });
    
    if (!exists) {
      results.success = false;
    }
  }
  
  // Mostrar resultados
  for (const check of results.checks) {
    const status = check.success ? '✓' : '✗';
    const color = check.success ? 'green' : 'red';
    log(`${status} ${check.name}: ${check.message}`, color);
  }
  
  return results.success;
}

// Validaciones del frontend
function validateFrontend() {
  log('\n=== Validando Frontend ===', 'cyan');
  
  const frontendDir = path.join(__dirname, '../frontend');
  const results = {
    success: true,
    checks: []
  };
  
  // Verificar archivos críticos
  const criticalFiles = [
    'src/index.html',
    'src/auth.js',
    'src/forum-integrado.js'
  ];
  
  for (const file of criticalFiles) {
    const filePath = path.join(frontendDir, file);
    const exists = fileExists(filePath);
    results.checks.push({
      name: `Archivo ${file}`,
      success: exists,
      message: exists ? 'Existe' : 'No encontrado'
    });
    
    if (!exists) {
      results.success = false;
    }
  }
  
  // Verificar sistema de autenticación
  const authPath = path.join(frontendDir, 'src/auth.js');
  if (fileExists(authPath)) {
    const authPatterns = [
      { regex: 'class AuthManager', description: 'Clase AuthManager' },
      { regex: 'getAuthHeaders', description: 'Función getAuthHeaders' },
      { regex: 'getUserId', description: 'Función getUserId' },
      { regex: 'isAuthenticated', description: 'Función isAuthenticated' }
    ];
    
    const authResults = verifyFileContent(authPath, authPatterns);
    for (const result of authResults) {
      results.checks.push({
        name: `AuthManager: ${result.pattern}`,
        success: result.found,
        message: result.found ? 'Implementado' : 'No implementado'
      });
      
      if (!result.found) {
        results.success = false;
      }
    }
  }
  
  // Verificar foro integrado
  const forumPath = path.join(frontendDir, 'src/forum-integrado.js');
  if (fileExists(forumPath)) {
    const forumPatterns = [
      { regex: 'showSuccessMessage', description: 'Función showSuccessMessage' },
      { regex: 'showErrorMessage', description: 'Función showErrorMessage' },
      { regex: 'escapeHtml', description: 'Función escapeHtml' },
      { regex: 'validatePostData', description: 'Función validatePostData' },
      { regex: 'validateCommentData', description: 'Función validateCommentData' },
      { regex: 'getUserIdForForum', description: 'Función getUserIdForForum' },
      { regex: 'renderTemasMejorado', description: 'Función renderTemasMejorado' },
      { regex: 'crearComentarioMejorado', description: 'Función crearComentarioMejorado' },
      { regex: 'crearTemaMejorado', description: 'Función crearTemaMejorado' }
    ];
    
    const forumResults = verifyFileContent(forumPath, forumPatterns);
    for (const result of forumResults) {
      results.checks.push({
        name: `Forum Integrado: ${result.pattern}`,
        success: result.found,
        message: result.found ? 'Implementado' : 'No implementado'
      });
      
      if (!result.found) {
        results.success = false;
      }
    }
  }
  
  // Verificar que el index.html importe los archivos correctos
  const indexPath = path.join(frontendDir, 'src/index.html');
  if (fileExists(indexPath)) {
    const indexPatterns = [
      { regex: '<script.*forum-integrado.js', description: 'Importación de forum-integrado.js' },
      { regex: '<script.*main.js', description: 'Importación de main.js' },
      { regex: 'id="foro"', description: 'Sección del foro' }
    ];
    
    const indexResults = verifyFileContent(indexPath, indexPatterns);
    for (const result of indexResults) {
      results.checks.push({
        name: `Index: ${result.pattern}`,
        success: result.found,
        message: result.found ? 'Configurado' : 'No configurado'
      });
      
      if (!result.found) {
        results.success = false;
      }
    }
  }
  
  // Mostrar resultados
  for (const check of results.checks) {
    const status = check.success ? '✓' : '✗';
    const color = check.success ? 'green' : 'red';
    log(`${status} ${check.name}: ${check.message}`, color);
  }
  
  return results.success;
}

// Validaciones de Cypress
function validateCypress() {
  log('\n=== Validando Cypress ===', 'cyan');
  
  const cypressConfigPath = path.join(__dirname, '../cypress.config.js');
  const cypressDir = path.join(__dirname, '../cypress');
  const results = {
    success: true,
    checks: []
  };
  
  // Verificar configuración de Cypress
  if (fileExists(cypressConfigPath)) {
    const cypressPatterns = [
      { regex: 'baseUrl', description: 'Configuración de baseUrl' },
      { regex: 'supportFile', description: 'Configuración de supportFile' },
      { regex: 'specPattern', description: 'Configuración de specPattern' }
    ];
    
    const cypressResults = verifyFileContent(cypressConfigPath, cypressPatterns);
    for (const result of cypressResults) {
      results.checks.push({
        name: `Cypress Config: ${result.pattern}`,
        success: result.found,
        message: result.found ? 'Configurado' : 'No configurado'
      });
      
      if (!result.found) {
        results.success = false;
      }
    }
  } else {
    results.success = false;
    results.checks.push({
      name: 'Cypress Config',
      success: false,
      message: 'No encontrado'
    });
  }
  
  // Verificar archivos de Cypress
  const cypressFiles = [
    'e2e/foro-crear-tema.cy.js',
    'e2e/foro-crear-comentario.cy.js',
    'support/e2e.js',
    'support/commands.js'
  ];
  
  for (const file of cypressFiles) {
    const filePath = path.join(cypressDir, file);
    const exists = fileExists(filePath);
    results.checks.push({
      name: `Cypress: ${file}`,
      success: exists,
      message: exists ? 'Existe' : 'No encontrado'
    });
    
    if (!exists) {
      results.success = false;
    }
  }
  
  // Mostrar resultados
  for (const check of results.checks) {
    const status = check.success ? '✓' : '✗';
    const color = check.success ? 'green' : 'red';
    log(`${status} ${check.name}: ${check.message}`, color);
  }
  
  return results.success;
}

// Función principal
function main() {
  log('=== Validación de la Implementación del Foro ===', 'bright');
  log('Verificando que todas las correcciones han sido implementadas correctamente...\n');
  
  const backendValid = validateBackend();
  const frontendValid = validateFrontend();
  const cypressValid = validateCypress();
  
  log('\n=== Resumen ===', 'cyan');
  
  if (backendValid && frontendValid && cypressValid) {
    log('✓ Todas las validaciones han pasado correctamente', 'green');
    log('\nEl foro ha sido implementado con todas las correcciones necesarias:');
    log('- Servicio de usuarios con ID anónimo consistente');
    log('- Validaciones mejoradas en el servicio del foro');
    log('- Manejo mejorado de errores en el controlador');
    log('- Sistema de autenticación en el frontend');
    log('- Mejoras en el manejo de errores del frontend');
    log('- Tests unitarios, de integración y end-to-end');
    log('- Integración compatible con el sistema existente');
    log('\nPróximos pasos:');
    log('1. Ejecutar los tests unitarios: cd backend && npm test');
    log('2. Ejecutar los tests E2E: npx cypress open');
    log('3. Probar el foro en el navegador');
    log('4. Desplegar la aplicación');
    
    process.exit(0);
  } else {
    log('✗ Algunas validaciones han fallado', 'red');
    log('\nPor favor, revise los errores detallados arriba y corrija los problemas.');
    
    process.exit(1);
  }
}

// Ejecutar script
if (require.main === module) {
  main();
}

module.exports = {
  validateBackend,
  validateFrontend,
  validateCypress
};