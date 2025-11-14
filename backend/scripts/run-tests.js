#!/usr/bin/env node

/**
 * Script para ejecutar pruebas y generar reportes
 * Automatiza el proceso de testing del backend Noti-ESET
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Iniciando suite de pruebas de Noti-ESET Backend\n');

// Configuración de colores para consola
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n📋 ${step}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Ejecutar comandos con manejo de errores
function runCommand(command, description, options = {}) {
  try {
    logStep(description);
    logInfo(`Ejecutando: ${command}`);

    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });

    if (options.silent) {
      console.log(result);
    }

    logSuccess(`${description} completado exitosamente`);
    return { success: true, output: result };
  } catch (error) {
    logError(`${description} falló`);
    if (options.silent) {
      console.log(error.stdout || error.message);
    }
    return { success: false, error: error.message };
  }
}

// Función principal
function main() {
  const startTime = Date.now();

  try {
    log('🔧 Noti-ESET Backend Test Runner', 'bright');
    log('=====================================', 'bright');

    // Verificar que estamos en el directorio correcto
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json no encontrado. Ejecuta desde el directorio raíz del backend.');
    }

    logSuccess('Entorno validado correctamente');

    // 1. Limpiar cobertura anterior si existe
    const coverageDir = path.join(projectRoot, 'coverage');
    if (fs.existsSync(coverageDir)) {
      logStep('Limpiando cobertura anterior');
      fs.rmSync(coverageDir, { recursive: true, force: true });
      logSuccess('Cobertura anterior limpiada');
    }

    // 2. Ejecutar pruebas con cobertura
    const testResult = runCommand(
      'npm run test:coverage',
      'Ejecutando pruebas con cobertura',
      { silent: false }
    );

    if (!testResult.success) {
      throw new Error('Las pruebas fallaron');
    }

    // 3. Verificar archivo de cobertura
    const coverageSummaryPath = path.join(projectRoot, 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageSummaryPath)) {
      logStep('Analizando resultados de cobertura');
      const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));

      const total = coverageSummary.total;
      log(`📊 Cobertura de código:`, 'magenta');
      log(`   Líneas: ${total.lines.pct}%`, total.lines.pct >= 80 ? 'green' : 'yellow');
      log(`   Funciones: ${total.functions.pct}%`, total.functions.pct >= 80 ? 'green' : 'yellow');
      log(`   Ramas: ${total.branches.pct}%`, total.branches.pct >= 80 ? 'green' : 'yellow');
      log(`   Sentencias: ${total.statements.pct}%`, total.statements.pct >= 80 ? 'green' : 'yellow');

      // Verificar umbrales mínimos
      const minCoverage = 80;
      const belowThreshold = Object.keys(total).filter(key =>
        key !== 'total' && total[key].pct < minCoverage
      );

      if (belowThreshold.length > 0) {
        logWarning(`Algunas métricas están por debajo del ${minCoverage}%`);
      } else {
        logSuccess('Todas las métricas de cobertura superan el umbral mínimo');
      }
    }

    // 4. Ejecutar script de reporte si existe
    const reportScriptPath = path.join(projectRoot, 'scripts', 'generate-test-report.js');
    if (fs.existsSync(reportScriptPath)) {
      logStep('Generando reporte detallado');
      const reportResult = runCommand(
        'node scripts/generate-test-report.js',
        'Generando reporte de pruebas'
      );

      if (!reportResult.success) {
        logWarning('No se pudo generar el reporte detallado');
      }
    }

    // 5. Tiempo total de ejecución
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    log('\n🎉 Suite de pruebas completada exitosamente!', 'green');
    log(`⏱️  Tiempo total: ${duration} segundos`, 'blue');
    log(`📁 Reportes generados en: ${path.join(projectRoot, 'coverage')}`, 'blue');

    process.exit(0);

  } catch (error) {
    logError(`Error en la suite de pruebas: ${error.message}`);
    logInfo('Revisa los logs arriba para más detalles');
    process.exit(1);
  }
}

// Manejo de señales para limpieza
process.on('SIGINT', () => {
  log('\n\n⚠️  Proceso interrumpido por el usuario', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\n\n⚠️  Proceso terminado', 'yellow');
  process.exit(1);
});

// Ejecutar script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}