#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colores para la salida de consola
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

// Función para ejecutar un comando y mostrar el resultado
function runCommand(command, description, options = {}) {
  log(`\n🚀 Ejecutando: ${description}`, 'cyan');
  
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    
    if (options.silent) {
      return result;
    }
    
    log(`✅ Completado: ${description}`, 'green');
    return result;
  } catch (error) {
    log(`❌ Error en: ${description}`, 'red');
    log(error.message, 'red');
    
    if (options.continueOnError) {
      log(`⚠️ Continuando a pesar del error...`, 'yellow');
      return null;
    } else {
      process.exit(1);
    }
  }
}

// Función para verificar si un directorio existe
function directoryExists(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch (err) {
    return false;
  }
}

// Función para crear un directorio si no existe
function ensureDirectoryExists(dir) {
  if (!directoryExists(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`📁 Creado directorio: ${dir}`, 'yellow');
  }
}

// Función para generar un reporte de pruebas
function generateReport(results) {
  const reportDir = path.join(process.cwd(), 'test-reports');
  ensureDirectoryExists(reportDir);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(reportDir, `test-report-${timestamp}.json`);
  
  fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
  log(`📊 Reporte guardado en: ${reportFile}`, 'green');
  
  return reportFile;
}

// Función principal
function main() {
  const args = process.argv.slice(2);
  const options = {
    unit: args.includes('--unit') || args.includes('-u'),
    integration: args.includes('--integration') || args.includes('-i'),
    e2e: args.includes('--e2e') || args.includes('-e'),
    performance: args.includes('--performance') || args.includes('-p'),
    load: args.includes('--load') || args.includes('-l'),
    coverage: args.includes('--coverage') || args.includes('-c'),
    silent: args.includes('--silent') || args.includes('-s'),
    help: args.includes('--help') || args.includes('-h')
  };
  
  // Si no se especifica ningún tipo de prueba, ejecutar todas
  const runAll = !options.unit && !options.integration && !options.e2e && !options.performance && !options.load;
  
  // Mostrar ayuda
  if (options.help) {
    log('🧪 Script de Ejecución Automática de Pruebas', 'bright');
    log('\nUso:', 'yellow');
    log('  node scripts/run-tests.js [opciones]', 'cyan');
    log('\nOpciones:', 'yellow');
    log('  -u, --unit        Ejecutar pruebas unitarias', 'cyan');
    log('  -i, --integration Ejecutar pruebas de integración', 'cyan');
    log('  -e, --e2e         Ejecutar pruebas end-to-end', 'cyan');
    log('  -p, --performance Ejecutar pruebas de rendimiento', 'cyan');
    log('  -l, --load        Ejecutar pruebas de carga', 'cyan');
    log('  -c, --coverage    Generar reporte de cobertura', 'cyan');
    log('  -s, --silent      Modo silencioso', 'cyan');
    log('  -h, --help        Mostrar esta ayuda', 'cyan');
    log('\nEjemplos:', 'yellow');
    log('  node scripts/run-tests.js                    # Ejecutar todas las pruebas', 'cyan');
    log('  node scripts/run-tests.js --unit --coverage  # Ejecutar pruebas unitarias con cobertura', 'cyan');
    log('  node scripts/run-tests.js --e2e               # Ejecutar pruebas end-to-end', 'cyan');
    process.exit(0);
  }
  
  log('🧪 Script de Ejecución Automática de Pruebas', 'bright');
  log(`⏰ Iniciado a las: ${new Date().toLocaleString()}`, 'blue');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };
  
  // Ejecutar pruebas unitarias del backend
  if (options.unit || runAll) {
    log('\n📋 Ejecutando Pruebas Unitarias del Backend', 'bright');
    
    const unitResults = runCommand(
      'cd backend && npm test',
      'Pruebas Unitarias del Backend',
      { silent: options.silent, continueOnError: true }
    );
    
    results.tests.unit = {
      status: unitResults ? 'passed' : 'failed',
      output: unitResults
    };
    
    results.summary.total++;
    if (unitResults) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Ejecutar pruebas de integración del backend
  if (options.integration || runAll) {
    log('\n🔗 Ejecutando Pruebas de Integración del Backend', 'bright');
    
    const integrationResults = runCommand(
      'cd backend && npm run test:integration',
      'Pruebas de Integración del Backend',
      { silent: options.silent, continueOnError: true }
    );
    
    results.tests.integration = {
      status: integrationResults ? 'passed' : 'failed',
      output: integrationResults
    };
    
    results.summary.total++;
    if (integrationResults) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Ejecutar pruebas end-to-end con Cypress
  if (options.e2e || runAll) {
    log('\n🌐 Ejecutando Pruebas End-to-End', 'bright');
    
    const e2eResults = runCommand(
      'npm run test:e2e',
      'Pruebas End-to-End',
      { silent: options.silent, continueOnError: true }
    );
    
    results.tests.e2e = {
      status: e2eResults ? 'passed' : 'failed',
      output: e2eResults
    };
    
    results.summary.total++;
    if (e2eResults) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Ejecutar pruebas de rendimiento con Cypress
  if (options.performance || runAll) {
    log('\n⚡ Ejecutando Pruebas de Rendimiento', 'bright');
    
    const performanceResults = runCommand(
      'npm run test:performance',
      'Pruebas de Rendimiento',
      { silent: options.silent, continueOnError: true }
    );
    
    results.tests.performance = {
      status: performanceResults ? 'passed' : 'failed',
      output: performanceResults
    };
    
    results.summary.total++;
    if (performanceResults) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Ejecutar pruebas de carga con Artillery
  if (options.load || runAll) {
    log('\n🚀 Ejecutando Pruebas de Carga', 'bright');
    
    // Verificar si Artillery está instalado
    try {
      runCommand('artillery --version', 'Verificar Artillery', { silent: true });
    } catch (error) {
      log('⚠️ Artillery no está instalado. Instalando...', 'yellow');
      runCommand('npm install -g artillery', 'Instalar Artillery');
    }
    
    const loadResults = runCommand(
      'artillery run tests/load/foro-load-test.yml',
      'Pruebas de Carga',
      { silent: options.silent, continueOnError: true }
    );
    
    results.tests.load = {
      status: loadResults ? 'passed' : 'failed',
      output: loadResults
    };
    
    results.summary.total++;
    if (loadResults) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Generar reporte de cobertura si se solicita
  if (options.coverage) {
    log('\n📊 Generando Reporte de Cobertura', 'bright');
    
    runCommand(
      'cd backend && npm run test:coverage',
      'Reporte de Cobertura',
      { silent: options.silent }
    );
  }
  
  // Generar reporte de pruebas
  const reportFile = generateReport(results);
  
  // Mostrar resumen
  log('\n📋 Resumen de Pruebas', 'bright');
  log(`Total: ${results.summary.total}`, 'blue');
  log(`Exitosas: ${results.summary.passed}`, 'green');
  log(`Fallidas: ${results.summary.failed}`, results.summary.failed > 0 ? 'red' : 'green');
  
  if (results.summary.failed > 0) {
    log('\n❌ Algunas pruebas fallaron. Revisa el reporte para más detalles.', 'red');
    process.exit(1);
  } else {
    log('\n✅ Todas las pruebas pasaron exitosamente.', 'green');
  }
  
  log(`\n⏰ Finalizado a las: ${new Date().toLocaleString()}`, 'blue');
  log(`📊 Reporte guardado en: ${reportFile}`, 'cyan');
}

// Ejecutar la función principal
main();