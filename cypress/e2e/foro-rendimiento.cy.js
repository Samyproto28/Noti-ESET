describe('Pruebas de Rendimiento del Foro', () => {
  beforeEach(() => {
    // Visitar la página del foro
    cy.visit('/#foro');
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    cy.get('.foro-controls').should('be.visible');
  });

  it('debería cargar la página del foro en un tiempo aceptable', () => {
    // Medir el tiempo de carga de la página
    cy.window().then((win) => {
      const performance = win.performance;
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      // Verificar que la página carga en menos de 3 segundos
      expect(loadTime).to.be.lessThan(3000);
      
      // Registrar el tiempo de carga
      cy.log(`Tiempo de carga de la página: ${loadTime}ms`);
    });
  });

  it('debería cargar los posts en un tiempo aceptable', () => {
    // Medir el tiempo de carga de los posts
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    cy.wait('@getPosts').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const loadTime = endTime - startTime;
        
        // Verificar que los posts cargan en menos de 1 segundo
        expect(loadTime).to.be.lessThan(1000);
        
        // Registrar el tiempo de carga
        cy.log(`Tiempo de carga de los posts: ${loadTime}ms`);
      });
    });
  });

  it('debería manejar eficientemente un gran número de posts', () => {
    // Crear un gran número de posts para probar el rendimiento
    for (let i = 0; i < 50; i++) {
      cy.crearTemaTest(`Tema de prueba ${i}`, `Contenido del tema de prueba ${i}`);
      cy.verificarMensajeExito('Tema creado exitosamente');
    }
    
    // Medir el tiempo de carga de los posts
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    cy.wait('@getPosts').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const loadTime = endTime - startTime;
        
        // Verificar que los posts cargan en menos de 2 segundos incluso con muchos posts
        expect(loadTime).to.be.lessThan(2000);
        
        // Registrar el tiempo de carga
        cy.log(`Tiempo de carga de ${50} posts: ${loadTime}ms`);
      });
    });
    
    // Verificar que la paginación funciona correctamente
    cy.get('.pagination').should('be.visible');
    cy.get('.pagination button[aria-label="Siguiente"]').should('be.visible');
    
    // Navegar a la siguiente página
    cy.get('.pagination button[aria-label="Siguiente"]').click();
    cy.wait('@getPosts');
    
    // Verificar que la segunda página carga en un tiempo aceptable
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    cy.wait('@getPosts').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const loadTime = endTime - startTime;
        
        // Verificar que la segunda página carga en menos de 1 segundo
        expect(loadTime).to.be.lessThan(1000);
        
        // Registrar el tiempo de carga
        cy.log(`Tiempo de carga de la segunda página: ${loadTime}ms`);
      });
    });
  });

  it('debería realizar búsquedas de manera eficiente', () => {
    // Crear posts para buscar
    for (let i = 0; i < 20; i++) {
      cy.crearTemaTest(`Tema de búsqueda ${i}`, `Contenido del tema de búsqueda ${i}`);
      cy.verificarMensajeExito('Tema creado exitosamente');
    }
    
    // Medir el tiempo de búsqueda
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    // Realizar una búsqueda
    cy.get('#search-input').type('búsqueda');
    cy.wait(500);
    cy.wait('@getPosts').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const searchTime = endTime - startTime;
        
        // Verificar que la búsqueda tarda menos de 1 segundo
        expect(searchTime).to.be.lessThan(1000);
        
        // Registrar el tiempo de búsqueda
        cy.log(`Tiempo de búsqueda: ${searchTime}ms`);
      });
    });
    
    // Verificar que los resultados de la búsqueda son correctos
    cy.get('.tema').should('have.length.greaterThan', 0);
    cy.get('.tema').each(($el) => {
      cy.wrap($el).should('contain', 'búsqueda');
    });
  });

  it('debería crear posts de manera eficiente', () => {
    // Medir el tiempo de creación de un post
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    // Crear un post
    cy.crearTemaTest('Tema de prueba de rendimiento', 'Contenido del tema de prueba de rendimiento');
    cy.verificarMensajeExito('Tema creado exitosamente');
    
    cy.window().then((win) => {
      const endTime = win.performance.now();
      const creationTime = endTime - startTime;
      
      // Verificar que la creación del post tarda menos de 2 segundos
      expect(creationTime).to.be.lessThan(2000);
      
      // Registrar el tiempo de creación
      cy.log(`Tiempo de creación del post: ${creationTime}ms`);
    });
  });

  it('debería crear comentarios de manera eficiente', () => {
    // Crear un post para comentar
    cy.crearTemaTest('Tema para comentarios de rendimiento', 'Contenido del tema para comentarios de rendimiento');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Medir el tiempo de creación de un comentario
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    // Crear un comentario
    cy.get('.form-comentar textarea').first().type('Comentario de prueba de rendimiento');
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    
    cy.window().then((win) => {
      const endTime = win.performance.now();
      const creationTime = endTime - startTime;
      
      // Verificar que la creación del comentario tarda menos de 1 segundo
      expect(creationTime).to.be.lessThan(1000);
      
      // Registrar el tiempo de creación
      cy.log(`Tiempo de creación del comentario: ${creationTime}ms`);
    });
  });

  it('debería manejar eficientemente las reacciones', () => {
    // Crear un post para reaccionar
    cy.crearTemaTest('Tema para reacciones de rendimiento', 'Contenido del tema para reacciones de rendimiento');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Medir el tiempo de reacción
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    // Reaccionar al post
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const reactionTime = endTime - startTime;
        
        // Verificar que la reacción tarda menos de 500ms
        expect(reactionTime).to.be.lessThan(500);
        
        // Registrar el tiempo de reacción
        cy.log(`Tiempo de reacción: ${reactionTime}ms`);
      });
    });
  });

  it('debería manejar eficientemente múltiples usuarios simultáneos', () => {
    // Simular múltiples usuarios creando posts simultáneamente
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      const promise = cy.window().then((win) => {
        const startTime = win.performance.now();
        
        return cy.crearTemaTest(`Tema simultáneo ${i}`, `Contenido del tema simultáneo ${i}`)
          .then(() => {
            return cy.window().then((win2) => {
              const endTime = win2.performance.now();
              const creationTime = endTime - startTime;
              
              // Registrar el tiempo de creación
              cy.log(`Tiempo de creación del tema simultáneo ${i}: ${creationTime}ms`);
              
              return creationTime;
            });
          });
      });
      
      promises.push(promise);
    }
    
    // Esperar a que todos los posts se creen
    Promise.all(promises).then((times) => {
      // Verificar que todos los posts se crearon en un tiempo aceptable
      times.forEach((time) => {
        expect(time).to.be.lessThan(3000);
      });
      
      // Calcular el tiempo promedio
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      cy.log(`Tiempo promedio de creación simultánea: ${avgTime}ms`);
    });
  });

  it('debería mantener un buen rendimiento con un gran número de comentarios', () => {
    // Crear un post
    cy.crearTemaTest('Tema con muchos comentarios', 'Contenido del tema con muchos comentarios');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Navegar al detalle del post
    cy.get('.tema-title').contains('Tema con muchos comentarios').click();
    cy.wait('@getPost');
    
    // Crear un gran número de comentarios
    for (let i = 0; i < 20; i++) {
      cy.get('.form-comentar textarea').type(`Comentario ${i}`);
      cy.get('.form-comentar button[type="submit"]').click();
      cy.verificarMensajeExito('Comentario creado exitosamente');
    }
    
    // Medir el tiempo de carga de los comentarios
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    cy.wait('@getCommentsByPost').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const loadTime = endTime - startTime;
        
        // Verificar que los comentarios cargan en menos de 2 segundos
        expect(loadTime).to.be.lessThan(2000);
        
        // Registrar el tiempo de carga
        cy.log(`Tiempo de carga de ${20} comentarios: ${loadTime}ms`);
      });
    });
  });

  it('debería mantener un buen rendimiento con un gran número de reacciones', () => {
    // Crear un post
    cy.crearTemaTest('Tema con muchas reacciones', 'Contenido del tema con muchas reacciones');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Crear un comentario para reaccionar
    cy.get('.form-comentar textarea').first().type('Comentario para muchas reacciones');
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    
    // Realizar múltiples reacciones
    const reactions = ['Me gusta', 'Me encanta', 'Me divierte', 'Me sorprende', 'Me enoja', 'Me entristece'];
    
    reactions.forEach((reaction, index) => {
      cy.get('.tema-actions button[title="' + reaction + '"]').first().click();
      cy.wait('@toggleReaction');
      
      cy.get('.comment-actions button[title="' + reaction + '"]').first().click();
      cy.wait('@toggleReaction');
    });
    
    // Medir el tiempo de carga de las reacciones
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    cy.wait('@getPostReactions').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const loadTime = endTime - startTime;
        
        // Verificar que las reacciones cargan en menos de 1 segundo
        expect(loadTime).to.be.lessThan(1000);
        
        // Registrar el tiempo de carga
        cy.log(`Tiempo de carga de las reacciones: ${loadTime}ms`);
      });
    });
  });

  it('debería mantener un buen rendimiento en dispositivos móviles', () => {
    // Cambiar a tamaño de pantalla móvil
    cy.viewport(375, 667);
    
    // Medir el tiempo de carga de la página en móvil
    cy.window().then((win) => {
      const performance = win.performance;
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      // Verificar que la página carga en menos de 4 segundos en móvil
      expect(loadTime).to.be.lessThan(4000);
      
      // Registrar el tiempo de carga
      cy.log(`Tiempo de carga de la página en móvil: ${loadTime}ms`);
    });
    
    // Medir el tiempo de carga de los posts en móvil
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    cy.wait('@getPosts').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const loadTime = endTime - startTime;
        
        // Verificar que los posts cargan en menos de 2 segundos en móvil
        expect(loadTime).to.be.lessThan(2000);
        
        // Registrar el tiempo de carga
        cy.log(`Tiempo de carga de los posts en móvil: ${loadTime}ms`);
      });
    });
    
    // Probar la creación de un post en móvil
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    cy.crearTemaTest('Tema creado en móvil', 'Contenido del tema creado en móvil');
    cy.verificarMensajeExito('Tema creado exitosamente');
    
    cy.window().then((win) => {
      const endTime = win.performance.now();
      const creationTime = endTime - startTime;
      
      // Verificar que la creación del post tarda menos de 3 segundos en móvil
      expect(creationTime).to.be.lessThan(3000);
      
      // Registrar el tiempo de creación
      cy.log(`Tiempo de creación del post en móvil: ${creationTime}ms`);
    });
  });

  it('debería mantener un buen rendimiento con una conexión lenta', () => {
    // Simular una conexión lenta
    cy.intercept('GET', '**/api/forum/posts', { 
      delay: 1000, 
      fixture: 'posts.json' 
    }).as('getPostsSlow');
    
    // Medir el tiempo de carga con conexión lenta
    let startTime;
    
    cy.window().then((win) => {
      startTime = win.performance.now();
    });
    
    cy.wait('@getPostsSlow').then(() => {
      cy.window().then((win) => {
        const endTime = win.performance.now();
        const loadTime = endTime - startTime;
        
        // Verificar que los posts cargan en menos de 3 segundos con conexión lenta
        expect(loadTime).to.be.lessThan(3000);
        
        // Registrar el tiempo de carga
        cy.log(`Tiempo de carga con conexión lenta: ${loadTime}ms`);
      });
    });
    
    // Verificar que la UI sigue siendo responsiva durante la carga
    cy.get('.loading-indicator').should('be.visible');
    cy.get('.temas-list').should('not.be.visible');
    
    // Esperar a que los posts carguen
    cy.wait('@getPostsSlow');
    
    // Verificar que los posts se muestran después de la carga
    cy.get('.loading-indicator').should('not.be.visible');
    cy.get('.temas-list').should('be.visible');
  });
});