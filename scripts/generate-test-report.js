#!/usr/bin/env node

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

// Función para verificar si un archivo existe
function fileExists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {
    return false;
  }
}

// Función para leer un archivo JSON
function readJsonFile(file) {
  try {
    if (fileExists(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    return null;
  } catch (err) {
    log(`Error al leer el archivo ${file}: ${err.message}`, 'red');
    return null;
  }
}

// Función para generar un reporte HTML
function generateHtmlReport(results) {
  const timestamp = new Date().toLocaleString();
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Pruebas - Foro ESET</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
        }
        header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .timestamp {
            color: #7f8c8d;
            font-size: 14px;
        }
        .summary {
            display: flex;
            justify-content: space-around;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .summary-item {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            min-width: 150px;
            margin: 10px;
        }
        .summary-item.total {
            background-color: #3498db;
            color: white;
        }
        .summary-item.passed {
            background-color: #2ecc71;
            color: white;
        }
        .summary-item.failed {
            background-color: #e74c3c;
            color: white;
        }
        .summary-item h3 {
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        .summary-item p {
            margin: 0;
            font-size: 14px;
        }
        .test-section {
            margin-bottom: 30px;
            border: 1px solid #eee;
            border-radius: 8px;
            overflow: hidden;
        }
        .test-header {
            padding: 15px 20px;
            background-color: #f8f9fa;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-header h2 {
            margin: 0;
            color: #2c3e50;
        }
        .status {
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
        }
        .status.passed {
            background-color: #d4edda;
            color: #155724;
        }
        .status.failed {
            background-color: #f8d7da;
            color: #721c24;
        }
        .test-content {
            padding: 20px;
        }
        .test-output {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            white-space: pre-wrap;
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
        }
        .no-output {
            color: #6c757d;
            font-style: italic;
        }
        footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #7f8c8d;
            font-size: 14px;
        }
        .performance-chart {
            margin: 20px 0;
            text-align: center;
        }
        .chart-container {
            position: relative;
            height: 300px;
            width: 100%;
        }
        @media (max-width: 768px) {
            .summary {
                flex-direction: column;
                align-items: center;
            }
            .summary-item {
                width: 80%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧪 Reporte de Pruebas - Foro ESET</h1>
            <p class="timestamp">Generado el: ${timestamp}</p>
        </header>
        
        <section class="summary">
            <div class="summary-item total">
                <h3>${results.summary.total}</h3>
                <p>Total de Pruebas</p>
            </div>
            <div class="summary-item passed">
                <h3>${results.summary.passed}</h3>
                <p>Pruebas Exitosas</p>
            </div>
            <div class="summary-item failed">
                <h3>${results.summary.failed}</h3>
                <p>Pruebas Fallidas</p>
            </div>
        </section>
        
        ${generateTestSections(results.tests)}
        
        <footer>
            <p>Reporte generado automáticamente por el sistema de pruebas de Foro ESET</p>
        </footer>
    </div>
    
    <script>
        // Función para alternar la visibilidad del contenido de las pruebas
        document.querySelectorAll('.test-header').forEach(header => {
            header.addEventListener('click', function() {
                const content = this.nextElementSibling;
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>
  `;
  
  return html;
}

// Función para generar las secciones de pruebas
function generateTestSections(tests) {
  let sections = '';
  
  // Sección de pruebas unitarias
  if (tests.unit) {
    sections += `
      <div class="test-section">
        <div class="test-header">
          <h2>📋 Pruebas Unitarias del Backend</h2>
          <span class="status ${tests.unit.status}">${tests.unit.status}</span>
        </div>
        <div class="test-content">
          ${tests.unit.output ? 
            `<div class="test-output">${escapeHtml(tests.unit.output)}</div>` : 
            '<p class="no-output">No hay salida disponible para esta prueba.</p>'
          }
        </div>
      </div>
    `;
  }
  
  // Sección de pruebas de integración
  if (tests.integration) {
    sections += `
      <div class="test-section">
        <div class="test-header">
          <h2>🔗 Pruebas de Integración del Backend</h2>
          <span class="status ${tests.integration.status}">${tests.integration.status}</span>
        </div>
        <div class="test-content">
          ${tests.integration.output ? 
            `<div class="test-output">${escapeHtml(tests.integration.output)}</div>` : 
            '<p class="no-output">No hay salida disponible para esta prueba.</p>'
          }
        </div>
      </div>
    `;
  }
  
  // Sección de pruebas end-to-end
  if (tests.e2e) {
    sections += `
      <div class="test-section">
        <div class="test-header">
          <h2>🌐 Pruebas End-to-End</h2>
          <span class="status ${tests.e2e.status}">${tests.e2e.status}</span>
        </div>
        <div class="test-content">
          ${tests.e2e.output ? 
            `<div class="test-output">${escapeHtml(tests.e2e.output)}</div>` : 
            '<p class="no-output">No hay salida disponible para esta prueba.</p>'
          }
        </div>
      </div>
    `;
  }
  
  // Sección de pruebas de rendimiento
  if (tests.performance) {
    sections += `
      <div class="test-section">
        <div class="test-header">
          <h2>⚡ Pruebas de Rendimiento</h2>
          <span class="status ${tests.performance.status}">${tests.performance.status}</span>
        </div>
        <div class="test-content">
          ${tests.performance.output ? 
            `<div class="test-output">${escapeHtml(tests.performance.output)}</div>` : 
            '<p class="no-output">No hay salida disponible para esta prueba.</p>'
          }
        </div>
      </div>
    `;
  }
  
  // Sección de pruebas de carga
  if (tests.load) {
    sections += `
      <div class="test-section">
        <div class="test-header">
          <h2>🚀 Pruebas de Carga</h2>
          <span class="status ${tests.load.status}">${tests.load.status}</span>
        </div>
        <div class="test-content">
          ${tests.load.output ? 
            `<div class="test-output">${escapeHtml(tests.load.output)}</div>` : 
            '<p class="no-output">No hay salida disponible para esta prueba.</p>'
          }
        </div>
      </div>
    `;
  }
  
  return sections;
}

// Función para escapar caracteres HTML
function escapeHtml(text) {
  const map = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Función principal
function main() {
  log('📊 Generando Reporte de Pruebas', 'bright');
  
  // Buscar archivos de reporte de pruebas
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  const testReportsDir = path.join(process.cwd(), 'test-reports');
  
  let results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };
  
  // Buscar reportes de pruebas unitarias
  const unitReportPath = path.join(artifactsDir, 'backend-tests', 'test-results.json');
  const unitReport = readJsonFile(unitReportPath);
  
  if (unitReport) {
    results.tests.unit = {
      status: unitReport.success ? 'passed' : 'failed',
      output: JSON.stringify(unitReport, null, 2)
    };
    
    results.summary.total++;
    if (unitReport.success) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Buscar reportes de pruebas de integración
  const integrationReportPath = path.join(artifactsDir, 'backend-tests', 'integration-results.json');
  const integrationReport = readJsonFile(integrationReportPath);
  
  if (integrationReport) {
    results.tests.integration = {
      status: integrationReport.success ? 'passed' : 'failed',
      output: JSON.stringify(integrationReport, null, 2)
    };
    
    results.summary.total++;
    if (integrationReport.success) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Buscar reportes de pruebas end-to-end
  const e2eReportPath = path.join(artifactsDir, 'frontend-e2e-tests', 'cypress-report', 'results.json');
  const e2eReport = readJsonFile(e2eReportPath);
  
  if (e2eReport) {
    results.tests.e2e = {
      status: e2eReport.stats ? (e2eReport.stats.failures === 0 ? 'passed' : 'failed') : 'unknown',
      output: JSON.stringify(e2eReport, null, 2)
    };
    
    results.summary.total++;
    if (e2eReport.stats && e2eReport.stats.failures === 0) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Buscar reportes de pruebas de rendimiento
  const performanceReportPath = path.join(artifactsDir, 'performance-report', 'performance-report.json');
  const performanceReport = readJsonFile(performanceReportPath);
  
  if (performanceReport) {
    results.tests.performance = {
      status: performanceReport.aggregate ? 'passed' : 'failed',
      output: JSON.stringify(performanceReport, null, 2)
    };
    
    results.summary.total++;
    if (performanceReport.aggregate) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Buscar reportes de pruebas de accesibilidad
  const accessibilityReportPath = path.join(artifactsDir, 'accessibility-report', 'cypress-report', 'results.json');
  const accessibilityReport = readJsonFile(accessibilityReportPath);
  
  if (accessibilityReport) {
    results.tests.accessibility = {
      status: accessibilityReport.stats ? (accessibilityReport.stats.failures === 0 ? 'passed' : 'failed') : 'unknown',
      output: JSON.stringify(accessibilityReport, null, 2)
    };
    
    results.summary.total++;
    if (accessibilityReport.stats && accessibilityReport.stats.failures === 0) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  }
  
  // Generar reporte HTML
  const htmlReport = generateHtmlReport(results);
  
  // Guardar reporte HTML
  const reportPath = path.join(process.cwd(), 'test-report.html');
  fs.writeFileSync(reportPath, htmlReport);
  
  log(`✅ Reporte HTML generado en: ${reportPath}`, 'green');
  
  // Mostrar resumen
  log('\n📋 Resumen de Pruebas', 'bright');
  log(`Total: ${results.summary.total}`, 'blue');
  log(`Exitosas: ${results.summary.passed}`, 'green');
  log(`Fallidas: ${results.summary.failed}`, results.summary.failed > 0 ? 'red' : 'green');
  
  // Guardar resultados en formato JSON
  const jsonReportPath = path.join(process.cwd(), 'test-results.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(results, null, 2));
  
  log(`📊 Resultados JSON guardados en: ${jsonReportPath}`, 'cyan');
}

// Ejecutar la función principal
main();