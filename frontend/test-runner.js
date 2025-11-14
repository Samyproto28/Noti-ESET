#!/usr/bin/env node

/**
 * Script para ejecutar pruebas y verificar que fallen como se espera (TDD)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

// Colores para la salida
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  colorLog(`\n🔧 ${description}`, 'cyan');
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    colorLog(`✅ Comando ejecutado correctamente`, 'green');
    return { success: true, output };
  } catch (error) {
    colorLog(`❌ Error ejecutando comando: ${error.message}`, 'red');
    return { success: false, error: error.message, output: error.stdout };
  }
}

function checkTestResults(testOutput) {
  // Buscar patrones específicos en la salida de las pruebas
  const failingTests = [];
  const passingTests = [];
  
  // Extraer resultados de las pruebas
  const testResults = testOutput.match(/(✓|×|✕)\s+([^\n]+)/g) || [];
  
  testResults.forEach(result => {
    if (result.startsWith('✓')) {
      passingTests.push(result);
    } else {
      failingTests.push(result);
    }
  });
  
  return { passingTests, failingTests };
}

function analyzeTestResults(results, testType) {
  colorLog(`\n📊 Análisis de resultados para ${testType}:`, 'blue');
  
  if (results.failingTests.length === 0) {
    colorLog(`⚠️  Advertencia: Todas las pruebas están pasando. Esto podría indicar que:`, 'yellow');
    colorLog(`   1. Las pruebas no están escritas correctamente (no detectan los errores)`, 'yellow');
    colorLog(`   2. Los errores ya han sido corregidos`, 'yellow');
    colorLog(`   3. Las validaciones de seguridad no están implementadas`, 'yellow');
  } else {
    colorLog(`✅ Excelente: ${results.failingTests.length} pruebas están fallando como se espera`, 'green');
    colorLog(`   Esto indica que las pruebas están detectando correctamente los errores existentes`, 'green');
    
    // Mostrar pruebas que fallan (esperado en TDD)
    colorLog(`\n📋 Pruebas que fallan (detectando errores):`, 'magenta');
    results.failingTests.forEach((test, index) => {
      colorLog(`   ${index + 1}. ${test}`, 'magenta');
    });
  }
  
  if (results.passingTests.length > 0) {
    colorLog(`\n✅ Pruebas que pasan (funcionalidad correcta):`, 'green');
    results.passingTests.forEach((test, index) => {
      colorLog(`   ${index + 1}. ${test}`, 'green');
    });
  }
  
  return results.failingTests.length > 0;
}

function main() {
  colorLog('🚀 Iniciando ejecución de pruebas TDD para Noti-ESET Frontend', 'blue');
  
  // Ejecutar pruebas de validación del foro
  const forumValidationResults = runCommand(
    'npm test -- --testPathPattern=forumValidation.test.js',
    'Ejecutando pruebas de validación del foro'
  );
  
  if (forumValidationResults.success) {
    const forumResults = checkTestResults(forumValidationResults.output);
    const forumTestsDetectingErrors = analyzeTestResults(forumResults, 'Validación del Foro');
    
    // Ejecutar pruebas de autenticación
    const authManagerResults = runCommand(
      'npm test -- --testPathPattern=authManager.test.js',
      'Ejecutando pruebas del gestor de autenticación'
    );
    
    if (authManagerResults.success) {
      const authResults = checkTestResults(authManagerResults.output);
      const authTestsDetectingErrors = analyzeTestResults(authResults, 'Gestor de Autenticación');
      
      // Resumen final
      colorLog('\n📋 RESUMEN DE PRUEBAS TDD', 'blue');
      colorLog('=====================================', 'blue');
      
      if (forumTestsDetectingErrors && authTestsDetectingErrors) {
        colorLog('✅ Estado: PRUEBAS LISTAS PARA IMPLEMENTACIÓN', 'green');
        colorLog('   Las pruebas están detectando correctamente los errores existentes', 'green');
        colorLog('   Siguiente paso: Implementar las correcciones para hacer pasar las pruebas', 'green');
      } else {
        colorLog('⚠️  Estado: REVISAR PRUEBAS', 'yellow');
        colorLog('   Algunas pruebas podrían no estar detectando errores correctamente', 'yellow');
        colorLog('   Siguiente paso: Mejorar las pruebas para que detecten los errores existentes', 'yellow');
      }
      
      colorLog('\n📝 Próximos pasos recomendados:', 'cyan');
      colorLog('1. Corregir las funciones de validación en forum.js', 'cyan');
      colorLog('2. Mejorar la sanitización de entrada para prevenir XSS', 'cyan');
      colorLog('3. Implementar manejo adecuado de errores en auth.js', 'cyan');
      colorLog('4. Ejecutar las pruebas nuevamente para verificar las correcciones', 'cyan');
      
    } else {
      colorLog('❌ Error al ejecutar pruebas de autenticación', 'red');
    }
  } else {
    colorLog('❌ Error al ejecutar pruebas de validación del foro', 'red');
  }
}

// Ejecutar el script principal
main();