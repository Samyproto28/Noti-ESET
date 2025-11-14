import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Validación de Estructura HTML - Análisis Estático', () => {
  const indexPath = path.join(projectRoot, '..', 'frontend', 'src', 'index.html');

  describe('Análisis Básico del Archivo HTML', () => {
    it('DEBERÍA existir el archivo index.html', () => {
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('DEBERÍA tener contenido válido', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content.trim().length).toBeGreaterThan(0);
    });

    it('DEBERÍA tener DOCTYPE HTML5', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/^<!DOCTYPE html>/i);
    });

    it('DEBERÍA tener etiquetas html, head y body', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/<html/i);
      expect(content).toMatch(/<head/i);
      expect(content).toMatch(/<body/i);
    });

    it('DEBERÍA tener cierre correcto de etiquetas', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');

      // Verificar que las etiquetas principales estén cerradas
      const openTags = ['html', 'head', 'body'];
      openTags.forEach(tag => {
        const openRegex = new RegExp(`<${tag}(>|\\s)`, 'gi');
        const closeRegex = new RegExp(`</${tag}>`, 'gi');

        const openMatches = content.match(openRegex) || [];
        const closeMatches = content.match(closeRegex) || [];

        // Mostrar información detallada para debugging
        if (openMatches.length !== closeMatches.length) {
          console.log(`Tag ${tag}: Open=${openMatches.length}, Close=${closeMatches.length}`);
          console.log('Open matches:', openMatches);
          console.log('Close matches:', closeMatches);
        }

        expect(openMatches.length).toBe(closeMatches.length);
      });
    });
  });

  describe('Análisis de Meta Tags y Configuración', () => {
    it('DEBERÍA tener charset UTF-8', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/charset\s*=\s*["']?utf-8["']?/i);
    });

    it('DEBERÍA tener viewport meta tag', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/<meta\s+name\s*=\s*["']viewport["']/i);
      expect(content).toMatch(/width\s*=\s*device-width/i);
    });

    it('DEBERÍA tener título descriptivo', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/<title>/i);

      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThan(60); // SEO best practice
      }
    });

    it('DEBERÍA tener meta description', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/<meta\s+name\s*=\s*["']description["']/i);

      const descMatch = content.match(/<meta\s+name\s*=\s*["']description["']\s+content\s*=\s*["'](.*?)["']/i);
      if (descMatch) {
        const description = descMatch[1].trim();
        expect(description.length).toBeGreaterThan(0);
        expect(description.length).toBeLessThan(160); // SEO best practice
      }
    });
  });

  describe('Análisis de Estructura Semántica', () => {
    it('DEBERÍA usar elementos semánticos de HTML5', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      const semanticElements = [
        'header', 'nav', 'main', 'section',
        'article', 'aside', 'footer'
      ];

      let foundSemanticElements = 0;
      semanticElements.forEach(element => {
        if (content.match(new RegExp(`<${element}`, 'gi'))) {
          foundSemanticElements++;
        }
      });

      expect(foundSemanticElements).toBeGreaterThanOrEqual(2);
    });

    it('DEBERÍA tener estructura de encabezados correcta', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');

      // Contar encabezados
      const h1Matches = content.match(/<h1/gi) || [];
      const h2Matches = content.match(/<h2/gi) || [];
      const h3Matches = content.match(/<h3/gi) || [];

      // No debería haber más de un H1
      expect(h1Matches.length).toBeLessThanOrEqual(1);

      // Si hay encabezados, debería empezar con H1
      const allHeadings = h1Matches.length + h2Matches.length + h3Matches.length;
      if (allHeadings > 0) {
        expect(h1Matches.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('DEBERÍA tener navegación si hay múltiples secciones', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');

      const hasNav = content.match(/<nav/gi);
      const hasMultipleSections = (content.match(/<section/gi) || []).length > 1;

      if (hasMultipleSections) {
        expect(hasNav).toBeTruthy();
      }
    });
  });

  describe('Análisis de Accesibilidad', () => {
    it('DEBERÍA tener imágenes con alt attribute', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      const imgMatches = content.match(/<img[^>]*>/gi) || [];

      imgMatches.forEach(imgTag => {
        // Las imágenes deben tener el atributo alt
        expect(imgTag).toMatch(/alt\s*=/i);
      });
    });

    it('DEBERÍA tener formularios accesibles', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      const formMatches = content.match(/<form[^>]*>.*?<\/form>/gis) || [];

      formMatches.forEach(form => {
        const inputMatches = form.match(/<input[^>]*>/gi) || [];

        inputMatches.forEach(input => {
          // Los inputs deberían tener label, aria-label o aria-labelledby
          const hasLabel = input.match(/aria-label\s*=/i) ||
                          input.match(/aria-labelledby\s*=/i) ||
                          form.match(/<label[^>]*for\s*=\s*["']/);

          // Si no es hidden, submit o button, debería tener etiqueta
          if (!input.match(/type\s*=\s*["']?(hidden|submit|button)["']?/i)) {
            expect(hasLabel).toBeTruthy();
          }
        });
      });
    });

    it('DEBERÍA tener lang attribute en html', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/<html[^>]*lang\s*=/i);
    });
  });

  describe('Análisis de Performance', () => {
    it('DEBERÍA tener CSS externo en lugar de inline', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');

      const inlineStyles = (content.match(/<style[^>]*>/gi) || []).length;
      const externalStyles = (content.match(/<link[^>]*rel\s*=\s*["']stylesheet["']/gi) || []).length;

      // Preferir CSS externo
      if (inlineStyles > 0) {
        expect(externalStyles).toBeGreaterThan(0);
      }
    });

    it('DEBERÍA tener scripts al final del body', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');

      // Buscar posición de los scripts en relación al body
      const bodyMatch = content.match(/<body[^>]*>(.*?)<\/body>/is);
      if (bodyMatch) {
        const bodyContent = bodyMatch[1];
        const bodyLength = bodyContent.length;

        const scriptMatches = bodyContent.match(/<script[^>]*src/gi) || [];

        scriptMatches.forEach((scriptMatch, index) => {
          const scriptPosition = bodyContent.indexOf(scriptMatch);
          const relativePosition = scriptPosition / bodyLength;

          // Scripts deberían estar en el último tercio del body
          expect(relativePosition).toBeGreaterThan(0.6);
        });
      }
    });

    it('DEBERÍA tener favicon', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toMatch(/<link[^>]*rel\s*=\s*["']?(?:icon|shortcut icon)["']/i);
    });
  });

  describe('Análisis de Seguridad y Mejores Prácticas', () => {
    it('NO DEBERÍA tener elementos obsoletos', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      const deprecatedElements = [
        '<font', '<center', '<marquee', '<blink', '<frame', '<frameset'
      ];

      deprecatedElements.forEach(element => {
        expect(content).not.toMatch(new RegExp(element, 'gi'));
      });
    });

    it('NO DEBERÍA tener estilos !important inline', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).not.toMatch(/style\s*=\s*["'][^"']*\!important/gi);
    });

    it('NO DEBERÍA tener código de debugging', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      const debugPatterns = [
        /console\.log/,
        /console\.debug/,
        /alert\(/,
        /debugger/
      ];

      debugPatterns.forEach(pattern => {
        expect(content).not.toMatch(pattern);
      });
    });

    it('NO DEBERÍA tener comentarios sensibles', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      const sensitivePatterns = [
        /<!--.*?password.*?-->/i,
        /<!--.*?secret.*?-->/i,
        /<!--.*?key.*?-->/i,
        /<!--.*?TODO.*?-->/i,
        /<!--.*?FIXME.*?-->/i
      ];

      sensitivePatterns.forEach(pattern => {
        expect(content).not.toMatch(pattern);
      });
    });

    it('DEBERÍA tener enlaces externos con rel="noopener"', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      const externalLinks = content.match(/<a[^>]*target\s*=\s*["']_blank["'][^>]*>/gi) || [];

      externalLinks.forEach(link => {
        expect(link).toMatch(/rel\s*=\s*["'][^"']*\bnoopener\b/);
      });
    });
  });

  describe('Análisis de Mobile-First', () => {
    it('DEBERÍA tener viewport configurado para mobile', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');
      const viewportMatch = content.match(/<meta\s+name\s*=\s*["']viewport["'][^>]*content\s*=\s*["'](.*?)["']/i);

      expect(viewportMatch).toBeTruthy();
      if (viewportMatch) {
        const content = viewportMatch[1];
        expect(content).toContain('width=device-width');
        expect(content).toContain('initial-scale=1');
      }
    });

    it('DEBERÍA tener elementos táctiles con tamaño apropiado', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');

      // Buscar botones específicamente
      const buttons = content.match(/<button[^>]*>/gi) || [];

      // Verificar que los botones tengan clases apropiadas
      buttons.forEach(button => {
        const hasButtonClass = button.includes('class="btn');

        // Los botones deberían tener clase btn para tamaño táctil apropiado
        expect(hasButtonClass || button.includes('style=') || button.includes('href=')).toBeTruthy();
      });

      // Si hay botones, al menos algunos deberían tener clase btn
      if (buttons.length > 0) {
        const buttonsWithClass = buttons.filter(button => button.includes('class="btn'));
        expect(buttonsWithClass.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Validación de Estructura de Carrusel (si existe)', () => {
    it('DEBERÍA tener estructura correcta si usa Swiper', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');

      if (content.includes('swiper') || content.includes('carousel')) {
        // Si usa carrusel, debería tener estructura adecuada
        expect(content).toMatch(/swiper-container|swiper-wrapper|swiper-slide/i);
      }
    });

    it('DEBERÍA tener navegación para carrusel si existe', () => {
      if (!fs.existsSync(indexPath)) return;

      const content = fs.readFileSync(indexPath, 'utf8');

      if (content.includes('swiper') || content.includes('carousel')) {
        // Debería tener botones de navegación o paginación
        const hasNavigation = content.includes('swiper-button') ||
                            content.includes('swiper-pagination') ||
                            content.includes('carousel-control');

        expect(hasNavigation).toBeTruthy();
      }
    });
  });
});