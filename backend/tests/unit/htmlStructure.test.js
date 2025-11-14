import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Validación de Estructura HTML', () => {
  const indexPath = path.join(projectRoot, '..', 'frontend', 'index.html');

  describe('Análisis de la Estructura Básica del HTML', () => {
    let dom;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        dom = new JSDOM(htmlContent);
      }
    });

    it('DEBERÍA tener un archivo index.html', () => {
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('DEBERÍA tener una estructura HTML5 válida', () => {
      if (!dom) return;

      const document = dom.window.document;

      // VerificarDOCTYPE
      expect(document.doctype).toBeTruthy();
      expect(document.doctype.name).toBe('html');

      // Verificar elemento html con lang
      const htmlElement = document.documentElement;
      expect(htmlElement.tagName.toLowerCase()).toBe('html');
      expect(htmlElement.hasAttribute('lang')).toBe(true);
    });

    it('DEBERÍA tener etiquetas head y body', () => {
      if (!dom) return;

      const document = dom.window.document;

      expect(document.querySelector('head')).toBeTruthy();
      expect(document.querySelector('body')).toBeTruthy();
    });

    it('DEBERÍA tener meta tags esenciales', () => {
      if (!dom) return;

      const document = dom.window.document;

      // Charset
      const charsetMeta = document.querySelector('meta[charset]');
      expect(charsetMeta).toBeTruthy();
      expect(charsetMeta.getAttribute('charset')).toMatch(/utf-8/i);

      // Viewport
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      expect(viewportMeta).toBeTruthy();
      expect(viewportMeta.getAttribute('content')).toContain('width=device-width');
    });
  });

  describe('Análisis de Accesibilidad y Semántica', () => {
    let dom;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        dom = new JSDOM(htmlContent);
      }
    });

    it('DEBERÍA tener un título descriptivo', () => {
      if (!dom) return;

      const title = dom.window.document.querySelector('title');
      expect(title).toBeTruthy();
      expect(title.textContent.trim().length).toBeGreaterThan(0);
    });

    it('DEBERÍA tener una estructura semántica correcta', () => {
      if (!dom) return;

      const document = dom.window.document;

      // Verificar que use elementos semánticos de HTML5
      const semanticElements = [
        'header', 'nav', 'main', 'section', 'article', 'aside', 'footer'
      ];

      let semanticCount = 0;
      semanticElements.forEach(element => {
        if (document.querySelector(element)) {
          semanticCount++;
        }
      });

      // Debería usar al menos 3 elementos semánticos
      expect(semanticCount).toBeGreaterThanOrEqual(3);
    });

    it('DEBERÍA tener estructura de encabezados jerárquica', () => {
      if (!dom) return;

      const document = dom.window.document;
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

      if (headings.length > 0) {
        // El primer encabezado debería ser h1
        const firstHeading = headings[0];
        expect(firstHeading.tagName.toLowerCase()).toBe('h1');

        // No debería haber más de un h1
        const h1Count = document.querySelectorAll('h1').length;
        expect(h1Count).toBeLessThanOrEqual(1);
      }
    });

    it('DEBERÍA tener atributos alt en imágenes', () => {
      if (!dom) return;

      const images = dom.window.document.querySelectorAll('img');
      images.forEach(img => {
        // Las imágenes decorativas pueden tener alt vacío, pero deben tener el atributo
        expect(img.hasAttribute('alt')).toBe(true);
      });
    });

    it('DEBERÍA tener etiquetas form con atributos accesibles', () => {
      if (!dom) return;

      const forms = dom.window.document.querySelectorAll('form');
      forms.forEach(form => {
        // Los formularios deberían tener etiquetas para sus inputs
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          const hasLabel = form.querySelector(`label[for="${input.id}"]`) ||
                          input.hasAttribute('aria-label') ||
                          input.hasAttribute('aria-labelledby') ||
                          input.closest('label');

          if (input.type !== 'hidden' && input.type !== 'submit') {
            expect(hasLabel).toBe(true);
          }
        });
      });
    });
  });

  describe('Análisis de Performance y Optimización', () => {
    let dom;
    let htmlContent;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        htmlContent = fs.readFileSync(indexPath, 'utf8');
        dom = new JSDOM(htmlContent);
      }
    });

    it('DEBERÍA tener CSS externo en lugar de estilos inline', () => {
      if (!dom) return;

      const document = dom.window.document;
      const inlineStyles = document.querySelectorAll('style');
      const linkStylesheets = document.querySelectorAll('link[rel="stylesheet"]');

      // Preferir CSS externo sobre inline
      expect(linkStylesheets.length + inlineStyles.length).toBeGreaterThan(0);

      // Si hay estilos inline, debería haber también CSS externo
      if (inlineStyles.length > 0) {
        expect(linkStylesheets.length).toBeGreaterThan(0);
      }
    });

    it('DEBERÍA tener scripts al final del body', () => {
      if (!dom) return;

      const document = dom.window.document;
      const scripts = document.querySelectorAll('script[src]');
      const body = document.querySelector('body');

      scripts.forEach(script => {
        // Los scripts externos deberían estar al final del body
        if (body.contains(script)) {
          const bodyChildren = Array.from(body.children);
          const scriptIndex = bodyChildren.indexOf(script);
          const totalChildren = bodyChildren.length;

          // El script debería estar en el último tercio del body
          expect(scriptIndex).toBeGreaterThan(totalChildren * 0.6);
        }
      });
    });

    it('DEBERÍA tener meta descriptions', () => {
      if (!dom) return;

      const document = dom.window.document;
      const metaDescription = document.querySelector('meta[name="description"]');

      if (metaDescription) {
        expect(metaDescription.getAttribute('content').trim().length).toBeGreaterThan(0);
        expect(metaDescription.getAttribute('content').length).toBeLessThanOrEqual(160);
      }
    });

    it('DEBERÍA tener tamaños de imagen especificados', () => {
      if (!dom) return;

      const images = dom.window.document.querySelectorAll('img');
      images.forEach(img => {
        // Las imágenes deberían tener width y height para mejorar CLS
        if (img.src && !img.src.includes('svg')) {
          const hasWidth = img.hasAttribute('width') || img.style.width;
          const hasHeight = img.hasAttribute('height') || img.style.height;

          // Al menos una de las dimensiones debería estar especificada
          expect(hasWidth || hasHeight).toBe(true);
        }
      });
    });
  });

  describe('Análisis de Enlaces y Recursos', () => {
    let dom;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        dom = new JSDOM(htmlContent);
      }
    });

    it('DEBERÍA tener favicon configurado', () => {
      if (!dom) return;

      const document = dom.window.document;
      const favicon = document.querySelector('link[rel*="icon"]');

      expect(favicon).toBeTruthy();
      if (favicon) {
        expect(favicon.getAttribute('href')).toBeTruthy();
      }
    });

    it('DEBERÍA tener enlaces HTTPS', () => {
      if (!dom) return;

      const document = dom.window.document;
      const links = document.querySelectorAll('a[href^="http"]');

      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('http')) {
          expect(href.startsWith('https://')).toBe(true);
        }
      });
    });

    it('DEBERÍA tener atributos target="_blank" con rel="noopener"', () => {
      if (!dom) return;

      const document = dom.window.document;
      const externalLinks = document.querySelectorAll('a[target="_blank"]');

      externalLinks.forEach(link => {
        const rel = link.getAttribute('rel') || '';
        expect(rel.split(' ')).toContain('noopener');
      });
    });
  });

  describe('Validación de Errores Comunes', () => {
    let dom;
    let htmlContent;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        htmlContent = fs.readFileSync(indexPath, 'utf8');
        dom = new JSDOM(htmlContent);
      }
    });

    it('NO DEBERÍA tener elementos obsoletos', () => {
      if (!dom) return;

      const deprecatedElements = [
        'font', 'center', 'marquee', 'blink', 'frame', 'frameset'
      ];

      deprecatedElements.forEach(element => {
        const found = dom.window.document.querySelector(element);
        expect(found).toBeFalsy();
      });
    });

    it('NO DEBERÍA tener estilos inline importantes', () => {
      if (!dom) return;

      const elementsWithImportant = dom.window.document.querySelectorAll('[style*="!important"]');
      expect(elementsWithImportant.length).toBe(0);
    });

    it('NO DEBERÍA tener console.log o código de debugging', () => {
      if (!htmlContent) return;

      const debugPatterns = [
        /console\.log/,
        /console\.debug/,
        /alert\(/,
        /debugger/
      ];

      debugPatterns.forEach(pattern => {
        expect(htmlContent).not.toMatch(pattern);
      });
    });

    it('NO DEBERÍA tener comentarios sensibles', () => {
      if (!htmlContent) return;

      const sensitivePatterns = [
        /TODO.*password/i,
        /FIXME.*secret/i,
        /XXX.*key/i,
        /hack/i,
        /temporal/i
      ];

      sensitivePatterns.forEach(pattern => {
        expect(htmlContent).not.toMatch(pattern);
      });
    });
  });

  describe('Validación de Mobile-First', () => {
    let dom;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        const htmlContent = fs.readFileSync(indexPath, 'utf8');
        dom = new JSDOM(htmlContent);
      }
    });

    it('DEBERÍA tener viewport configurado para mobile', () => {
      if (!dom) return;

      const viewportMeta = dom.window.document.querySelector('meta[name="viewport"]');
      expect(viewportMeta).toBeTruthy();

      const content = viewportMeta.getAttribute('content');
      expect(content).toContain('width=device-width');
      expect(content).toContain('initial-scale=1');
    });

    it('DEBERÍA tener elementos táctiles apropiados', () => {
      if (!dom) return;

      const document = dom.window.document;
      const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');

      buttons.forEach(button => {
        // Los elementos táctiles deberían tener tamaño mínimo de 44x44px
        const style = window.getComputedStyle ?
          window.getComputedStyle(button) : {};

        // Al menos debería tener padding o tamaño adecuado
        const hasMinSize = button.style.padding ||
                          button.style.minWidth ||
                          button.style.minHeight ||
                          button.className.includes('btn') ||
                          button.tagName.toLowerCase() === 'a';

        expect(hasMinSize).toBe(true);
      });
    });
  });
});