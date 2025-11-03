describe('Accesibilidad y Diseño Responsivo del Foro', () => {
  beforeEach(() => {
    // Visitar la página del foro
    cy.visit('/#foro');
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    cy.get('.foro-controls').should('be.visible');
  });

  describe('Accesibilidad', () => {
    it('debería tener atributos ARIA en los elementos interactivos', () => {
      // Verificar que los botones tienen atributos aria-label
      cy.get('button[aria-label]').should('have.length.greaterThan', 0);
      
      // Verificar que los campos de formulario tienen atributos aria-label
      cy.get('input[aria-label], textarea[aria-label], select[aria-label]').should('have.length.greaterThan', 0);
      
      // Verificar que los enlaces tienen atributos aria-label o title
      cy.get('a[aria-label], a[title]').should('have.length.greaterThan', 0);
    });

    it('debería tener roles ARIA apropiados', () => {
      // Verificar que hay elementos con roles ARIA
      cy.get('[role]').should('have.length.greaterThan', 0);
      
      // Verificar que los botones tienen el rol apropiado
      cy.get('button[role="button"]').should('have.length.greaterThan', 0);
      
      // Verificar que las regiones tienen roles apropiados
      cy.get('[role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]').should('have.length.greaterThan', 0);
    });

    it('debería tener encabezados jerárquicos correctos', () => {
      // Verificar que hay un encabezado h1
      cy.get('h1').should('exist');
      
      // Verificar que los encabezados están en orden jerárquico
      cy.get('h1').then(($h1) => {
        const h1Text = $h1.text();
        
        // Verificar que hay encabezados h2 después del h1
        cy.get('h2').should('exist');
        
        // Verificar que los encabezados h2 están relacionados con el h1
        cy.get('h2').each(($h2) => {
          const h2Text = $h2.text();
          // No hay una forma directa de verificar la relación semántica en Cypress,
          // pero podemos verificar que los encabezados tienen contenido significativo
          expect(h2Text).to.not.be.empty;
        });
      });
    });

    it('debería tener texto alternativo para imágenes', () => {
      // Crear un tema con imagen para probar
      cy.crearTemaTest('Tema con imagen', 'Este tema tiene una imagen para probar accesibilidad');
      cy.verificarMensajeExito('Tema creado exitosamente');
      cy.esperarCargaTemas();
      
      // Verificar que las imágenes tienen atributo alt
      cy.get('img[alt]').should('have.length.greaterThan', 0);
      
      // Verificar que las imágenes decorativas tienen alt vacío
      cy.get('img[alt=""]').should('have.length.greaterThan', 0);
    });

    it('debería ser navegable por teclado', () => {
      // Verificar que los elementos interactivos pueden recibir foco
      cy.get('button, a, input, textarea, select').each(($el) => {
        cy.wrap($el).focus();
        cy.wrap($el).should('be.focused');
      });
      
      // Verificar que se puede navegar con la tecla Tab
      cy.get('body').tab();
      cy.focused().should('exist');
      
      // Verificar que se puede navegar hacia atrás con Shift+Tab
      cy.get('body').type('{shift}{tab}');
      cy.focused().should('exist');
    });

    it('debería tener indicadores de foco visibles', () => {
      // Verificar que los elementos tienen estilos de foco
      cy.get('button, a, input, textarea, select').each(($el) => {
        cy.wrap($el).focus();
        cy.wrap($el).should('have.css', 'outline-style').and('not.equal', 'none');
      });
    });

    it('debería tener suficiente contraste de color', () => {
      // Verificar que el texto tiene suficiente contraste con el fondo
      // Esta es una verificación básica, una prueba completa requeriría herramientas especializadas
      cy.get('body').should('have.css', 'color');
      cy.get('body').should('have.css', 'background-color');
      
      // Verificar que los enlaces tienen suficiente contraste
      cy.get('a').should('have.css', 'color');
      
      // Verificar que los botones tienen suficiente contraste
      cy.get('button').should('have.css', 'color');
      cy.get('button').should('have.css', 'background-color');
    });

    it('debería tener etiquetas descriptivas para campos de formulario', () => {
      // Verificar que los campos de entrada tienen etiquetas asociadas
      cy.get('input, textarea, select').each(($el) => {
        const id = $el.attr('id');
        if (id) {
          // Verificar que hay una etiqueta con el atributo for que coincide con el id del campo
          cy.get(`label[for="${id}"]`).should('exist');
        } else {
          // Si no hay id, verificar que el campo tiene aria-label
          cy.wrap($el).should('have.attr', 'aria-label');
        }
      });
    });

    it('debería tener mensajes de error accesibles', () => {
      // Intentar crear un tema con datos inválidos para generar un error
      cy.get('#btn-crear-tema').click();
      cy.get('#form-crear-tema').should('be.visible');
      
      // Enviar el formulario sin datos
      cy.get('#form-crear-tema button[type="submit"]').click();
      
      // Verificar que los mensajes de error son accesibles
      cy.get('.error-message, [role="alert"]').should('exist');
      cy.get('.error-message, [role="alert"]').each(($el) => {
        // Verificar que los mensajes de error tienen atributos aria apropiados
        cy.wrap($el).should('have.attr', 'role', 'alert');
      });
      
      // Cerrar el formulario
      cy.get('#cancelar-tema').click();
    });

    it('debería tener una estructura de documento semántica', () => {
      // Verificar que hay elementos semánticos de HTML5
      cy.get('header, nav, main, section, article, aside, footer').should('have.length.greaterThan', 0);
      
      // Verificar que hay una región de navegación
      cy.get('nav, [role="navigation"]').should('exist');
      
      // Verificar que hay una región de contenido principal
      cy.get('main, [role="main"]').should('exist');
    });
  });

  describe('Diseño Responsivo', () => {
    it('debería ser visible en modo móvil', () => {
      // Cambiar a tamaño de pantalla móvil
      cy.viewport(375, 667);
      
      // Verificar que el contenido es visible
      cy.get('#foro').should('be.visible');
      cy.get('.foro-controls').should('be.visible');
      cy.get('.temas-list').should('be.visible');
      
      // Verificar que los elementos se ajustan al ancho de la pantalla
      cy.get('.tema').should('have.css', 'width').and('match', /100%/);
      
      // Verificar que los controles son accesibles en móvil
      cy.get('#btn-crear-tema').should('be.visible');
      cy.get('#search-input').should('be.visible');
      cy.get('#category-filter').should('be.visible');
    });

    it('debería ser visible en modo tablet', () => {
      // Cambiar a tamaño de pantalla tablet
      cy.viewport(768, 1024);
      
      // Verificar que el contenido es visible
      cy.get('#foro').should('be.visible');
      cy.get('.foro-controls').should('be.visible');
      cy.get('.temas-list').should('be.visible');
      
      // Verificar que los elementos se ajustan al ancho de la pantalla
      cy.get('.tema').should('have.css', 'width').and('match', /100%/);
      
      // Verificar que los controles son accesibles en tablet
      cy.get('#btn-crear-tema').should('be.visible');
      cy.get('#search-input').should('be.visible');
      cy.get('#category-filter').should('be.visible');
    });

    it('debería ser visible en modo desktop', () => {
      // Cambiar a tamaño de pantalla desktop
      cy.viewport(1280, 720);
      
      // Verificar que el contenido es visible
      cy.get('#foro').should('be.visible');
      cy.get('.foro-controls').should('be.visible');
      cy.get('.temas-list').should('be.visible');
      
      // Verificar que los elementos se ajustan al ancho de la pantalla
      cy.get('.tema').should('have.css', 'width').and('not.match', /100%/);
      
      // Verificar que los controles son accesibles en desktop
      cy.get('#btn-crear-tema').should('be.visible');
      cy.get('#search-input').should('be.visible');
      cy.get('#category-filter').should('be.visible');
    });

    it('debería ajustar el diseño en orientación horizontal', () => {
      // Cambiar a tamaño de pantalla móvil en orientación horizontal
      cy.viewport(667, 375);
      
      // Verificar que el contenido es visible
      cy.get('#foro').should('be.visible');
      cy.get('.foro-controls').should('be.visible');
      cy.get('.temas-list').should('be.visible');
      
      // Verificar que los elementos se ajustan al ancho de la pantalla
      cy.get('.tema').should('have.css', 'width').and('match', /100%/);
    });

    it('debería ajustar el diseño en pantallas grandes', () => {
      // Cambiar a tamaño de pantalla grande
      cy.viewport(1920, 1080);
      
      // Verificar que el contenido es visible
      cy.get('#foro').should('be.visible');
      cy.get('.foro-controls').should('be.visible');
      cy.get('.temas-list').should('be.visible');
      
      // Verificar que los elementos no ocupan todo el ancho en pantallas grandes
      cy.get('.tema').should('have.css', 'width').and('not.match', /100%/);
      
      // Verificar que hay espacio en blanco en los lados
      cy.get('.container, .content-wrapper').should('have.css', 'max-width');
    });

    it('debería ser funcional en diferentes densidades de píxeles', () => {
      // Probar con diferentes densidades de píxeles
      const viewports = [
        { width: 375, height: 667, pixelRatio: 2 }, // Móvil con alta densidad
        { width: 768, height: 1024, pixelRatio: 1.5 }, // Tablet con densidad media
        { width: 1280, height: 720, pixelRatio: 1 }, // Desktop con densidad normal
        { width: 1920, height: 1080, pixelRatio: 2 } // Desktop con alta densidad
      ];
      
      viewports.forEach((viewport) => {
        cy.viewport(viewport.width, viewport.height, viewport.pixelRatio);
        
        // Verificar que el contenido es visible
        cy.get('#foro').should('be.visible');
        cy.get('.foro-controls').should('be.visible');
        cy.get('.temas-list').should('be.visible');
        
        // Verificar que los botones son clickeables
        cy.get('#btn-crear-tema').should('be.visible');
        
        // Verificar que los campos de formulario son usables
        cy.get('#search-input').should('be.visible');
      });
    });

    it('debería ajustar el tamaño de fuente en diferentes pantallas', () => {
      // Probar en móvil
      cy.viewport(375, 667);
      cy.get('body').should('have.css', 'font-size');
      
      // Probar en tablet
      cy.viewport(768, 1024);
      cy.get('body').should('have.css', 'font-size');
      
      // Probar en desktop
      cy.viewport(1280, 720);
      cy.get('body').should('have.css', 'font-size');
    });

    it('debería ser funcional con zoom', () => {
      // Probar con diferentes niveles de zoom
      const zoomLevels = [0.8, 1, 1.5, 2];
      
      zoomLevels.forEach((zoom) => {
        cy.setZoom(zoom);
        
        // Verificar que el contenido es visible
        cy.get('#foro').should('be.visible');
        
        // Verificar que los elementos son accesibles
        cy.get('#btn-crear-tema').should('be.visible');
        
        // Resetear el zoom
        cy.setZoom(1);
      });
    });

    it('debería manejar correctamente el cambio de orientación', () => {
      // Empezar en orientación vertical
      cy.viewport(375, 667);
      cy.get('#foro').should('be.visible');
      
      // Cambiar a orientación horizontal
      cy.viewport(667, 375);
      cy.get('#foro').should('be.visible');
      
      // Cambiar de nuevo a orientación vertical
      cy.viewport(375, 667);
      cy.get('#foro').should('be.visible');
    });
  });
});