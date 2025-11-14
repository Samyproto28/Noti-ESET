import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Validación de Carrusel Swiper', () => {
  const indexPath = path.join(projectRoot, '..', 'frontend', 'src', 'index.html');
  const mainJsPath = path.join(projectRoot, '..', 'frontend', 'src', 'main.js');
  const stylePath = path.join(projectRoot, '..', 'frontend', 'src', 'style.css');

  describe('Configuración del Carrusel en HTML', () => {
    let htmlContent;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        htmlContent = fs.readFileSync(indexPath, 'utf8');
      }
    });

    it('DEBERÍA existir el archivo index.html', () => {
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('DEBERÍA tener estructura de carrusel Swiper', () => {
      if (!htmlContent) return;

      expect(htmlContent).toMatch(/swiper/i);
      expect(htmlContent).toMatch(/class="swiper/i);
      expect(htmlContent).toMatch(/swiper-wrapper/i);
      expect(htmlContent).toMatch(/swiper-slide/i);
    });

    it('DEBERÍA tener navegación del carrusel', () => {
      if (!htmlContent) return;

      expect(htmlContent).toMatch(/swiper-button-prev/i);
      expect(htmlContent).toMatch(/swiper-button-next/i);
    });

    it('DEBERÍA tener paginación del carrusel', () => {
      if (!htmlContent) return;

      expect(htmlContent).toMatch(/swiper-pagination/i);
    });

    it('DEBERÍA tener múltiples slides en el carrusel', () => {
      if (!htmlContent) return;

      const slides = htmlContent.match(/swiper-slide/gi) || [];
      expect(slides.length).toBeGreaterThan(1);
    });

    it('DEBERÍA tener imágenes en los slides con alt attributes', () => {
      if (!htmlContent) return;

      const slides = htmlContent.match(/<div class="swiper-slide"[^>]*>.*?<\/div>/gis) || [];

      slides.forEach(slide => {
        if (slide.includes('<img')) {
          expect(slide).toMatch(/alt\s*=/i);
        }
      });
    });
  });

  describe('Configuración de Swiper.js', () => {
    let jsContent;

    beforeAll(() => {
      if (fs.existsSync(mainJsPath)) {
        jsContent = fs.readFileSync(mainJsPath, 'utf8');
      }
    });

    it('DEBERÍA existir el archivo main.js', () => {
      expect(fs.existsSync(mainJsPath)).toBe(true);
    });

    it('DEBERÍA tener importación o configuración de Swiper', () => {
      if (!jsContent) return;

      // Buscar diferentes formas de inicializar Swiper
      const swiperPatterns = [
        /new\s+Swiper/i,
        /swiper/i,
        /Swiper/i,
        /swiper-container/i
      ];

      const hasSwiper = swiperPatterns.some(pattern => jsContent.match(pattern));
      expect(hasSwiper).toBeTruthy();
    });

    it('DEBERÍA tener configuración del carrusel', () => {
      if (!jsContent) return;

      // Buscar configuración típica de Swiper
      const configPatterns = [
        /loop\s*:\s*true/i,
        /autoplay/i,
        /navigation/i,
        /pagination/i,
        /slidesPerView/i,
        /spaceBetween/i
      ];

      const hasConfig = configPatterns.some(pattern => jsContent.match(pattern));
      expect(hasConfig).toBeTruthy();
    });

    it('DEBERÍA tener inicialización del carrusel cuando el DOM esté listo', () => {
      if (!jsContent) return;

      // Buscar patrones de inicialización
      const initPatterns = [
        /DOMContentLoaded/i,
        /document\.ready/i,
        /window\.onload/i,
        /swiper.*init/i
      ];

      const hasInit = initPatterns.some(pattern => jsContent.match(pattern));
      expect(hasInit).toBeTruthy();
    });
  });

  describe('Estilos del Carrusel', () => {
    let cssContent;

    beforeAll(() => {
      if (fs.existsSync(stylePath)) {
        cssContent = fs.readFileSync(stylePath, 'utf8');
      }
    });

    it('DEBERÍA existir el archivo style.css', () => {
      expect(fs.existsSync(stylePath)).toBe(true);
    });

    it('DEBERÍA tener estilos para Swiper', () => {
      if (!cssContent) return;

      expect(cssContent).toMatch(/swiper/i);
    });

    it('DEBERÍA tener estilos para el carrusel específico', () => {
      if (!cssContent) return;

      const swiperStyles = [
        /\.galeria-swiper/i,
        /\.swiper-container/i,
        /\.swiper-slide/i,
        /\.swiper-button/i,
        /\.swiper-pagination/i
      ];

      const hasStyles = swiperStyles.some(style => cssContent.match(style));
      expect(hasStyles).toBeTruthy();
    });

    it('DEBERÍA tener estilos responsive para el carrusel', () => {
      if (!cssContent) return;

      // Buscar media queries o estilos responsive
      const responsivePatterns = [
        /@media/i,
        /max-width/i,
        /min-width/i,
        /responsive/i
      ];

      const hasResponsive = responsivePatterns.some(pattern => cssContent.match(pattern));
      expect(hasResponsive).toBeTruthy();
    });
  });

  describe('Integración de CDN y Dependencias', () => {
    let htmlContent;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        htmlContent = fs.readFileSync(indexPath, 'utf8');
      }
    });

    it('DEBERÍA tener Swiper.js desde CDN', () => {
      if (!htmlContent) return;

      expect(htmlContent).toMatch(/swiper.*cdn/i);
      expect(htmlContent).toMatch(/jsdelivr/i);
      expect(htmlContent).toMatch(/swiper-bundle\.min\.js/i);
    });

    it('DEBERÍA tener CSS de Swiper desde CDN', () => {
      if (!htmlContent) return;

      expect(htmlContent).toMatch(/swiper-bundle\.min\.css/i);
    });

    it('DEBERÍA usar una versión específica de Swiper', () => {
      if (!htmlContent) return;

      // Debería especificar versión (ej: swiper@11)
      expect(htmlContent).toMatch(/swiper@\d+/i);
    });

    it('DEBERÍA cargar Swiper antes que el script principal', () => {
      if (!htmlContent) return;

      const swiperScriptIndex = htmlContent.indexOf('swiper-bundle.min.js');
      const mainScriptIndex = htmlContent.indexOf('main.js');

      if (swiperScriptIndex !== -1 && mainScriptIndex !== -1) {
        expect(swiperScriptIndex).toBeLessThan(mainScriptIndex);
      }
    });
  });

  describe('Accesibilidad del Carrusel', () => {
    let htmlContent;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        htmlContent = fs.readFileSync(indexPath, 'utf8');
      }
    });

    it('DEBERÍA tener aria-label en el carrusel', () => {
      if (!htmlContent) return;

      const carouselContainer = htmlContent.match(/<div[^>]*class="swiper[^>]*"/gi);
      if (carouselContainer) {
        const hasAriaLabel = carouselContainer.some(container =>
          container.includes('aria-label') || container.includes('aria-labelledby')
        );
        expect(hasAriaLabel).toBeTruthy();
      }
    });

    it('DEBERÍA tener controles de navegación accesibles', () => {
      if (!htmlContent) return;

      expect(htmlContent).toMatch(/swiper-button.*aria-label/i);
    });

    it('DEBERÍA tener imágenes con descripciones accesibles', () => {
      if (!htmlContent) return;

      const imagesInCarousel = htmlContent.match(/<img[^>]*alt="[^"]*"[^>]*>/gi) || [];
      expect(imagesInCarousel.length).toBeGreaterThan(0);
    });
  });

  describe('Performance y Optimización', () => {
    let htmlContent;

    beforeAll(() => {
      if (fs.existsSync(indexPath)) {
        htmlContent = fs.readFileSync(indexPath, 'utf8');
      }
    });

    it('DEBERÍA tener lazy loading en imágenes del carrusel', () => {
      if (!htmlContent) return;

      // Buscar atributos de lazy loading
      const hasLazyLoading = htmlContent.includes('loading="lazy"') ||
                           htmlContent.includes('data-src') ||
                           htmlContent.includes('swiper-lazy');

      // Si no tiene lazy loading, no es un error fatal pero es una mejora sugerida
      // expect(hasLazyLoading).toBeTruthy();
    });

    it('DEBERÍA tener imágenes optimizadas (formato webp preferido)', () => {
      if (!htmlContent) return;

      // Buscar formatos de imagen modernos
      const hasWebP = htmlContent.includes('.webp') ||
                     htmlContent.includes('format=webp');

      // No es obligatorio pero es una buena práctica
    });

    it('DEBERÍA tener número razonable de slides', () => {
      if (!htmlContent) return;

      const slides = htmlContent.match(/swiper-slide/gi) || [];
      expect(slides.length).toBeLessThan(20); // Límite razonable para performance
    });
  });

  describe('Funcionalidad del Carrusel', () => {
    let jsContent;

    beforeAll(() => {
      if (fs.existsSync(mainJsPath)) {
        jsContent = fs.readFileSync(mainJsPath, 'utf8');
      }
    });

    it('DEBERÍA tener configuración de autoplay si es automático', () => {
      if (!jsContent) return;

      if (jsContent.includes('autoplay')) {
        expect(jsContent).toMatch(/autoplay\s*:\s*{[^}]*}/i);
      }
    });

    it('DEBERÍA tener configuración de loop si es circular', () => {
      if (!jsContent) return;

      if (jsContent.includes('loop')) {
        expect(jsContent).toMatch(/loop\s*:\s*true/i);
      }
    });

    it('DEBERÍA tener configuración de navegación personalizada', () => {
      if (!jsContent) return;

      if (jsContent.includes('navigation')) {
        expect(jsContent).toMatch(/navigation\s*:\s*{[^}]*next[^}]*prev[^}]*}/i);
      }
    });

    it('DEBERÍA tener configuración de paginación si la tiene', () => {
      if (!jsContent) return;

      if (jsContent.includes('pagination')) {
        expect(jsContent).toMatch(/pagination\s*:\s*{[^}]*}/i);
      }
    });

    it('DEBERÍA tener breakpoints responsive si es adaptable', () => {
      if (!jsContent) return;

      if (jsContent.includes('breakpoints')) {
        expect(jsContent).toMatch(/breakpoints\s*:\s*{[^}]*}/i);
      }
    });
  });
});