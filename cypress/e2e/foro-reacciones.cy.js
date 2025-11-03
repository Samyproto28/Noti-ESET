describe('Reacciones en el Foro', () => {
  beforeEach(() => {
    // Visitar la página del foro
    cy.visit('/#foro');
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    cy.get('.foro-controls').should('be.visible');
    
    // Crear un tema de prueba si no existe
    cy.crearTemaTest('Tema para reacciones', 'Este tema es específicamente para probar la funcionalidad de reacciones en el foro.');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
  });

  it('debería mostrar botones de reacción para posts', () => {
    // Verificar que los botones de reacción están visibles
    cy.get('.tema-actions button[title="Me gusta"]').should('be.visible');
    cy.get('.tema-actions button[title="No me gusta"]').should('be.visible');
    cy.get('.tema-actions button[title="Me encanta"]').should('be.visible');
    cy.get('.tema-actions button[title="Me divierte"]').should('be.visible');
    cy.get('.tema-actions button[title="Me sorprende"]').should('be.visible');
    cy.get('.tema-actions button[title="Me enoja"]').should('be.visible');
    cy.get('.tema-actions button[title="Me entristece"]').should('be.visible');
  });

  it('debería mostrar botones de reacción para comentarios', () => {
    // Crear un comentario primero
    cy.get('.form-comentar textarea').first().type('Comentario para reacciones');
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.esperarCargaTemas();

    // Verificar que los botones de reacción están visibles para el comentario
    cy.get('.comment-actions button[title="Me gusta"]').should('be.visible');
    cy.get('.comment-actions button[title="No me gusta"]').should('be.visible');
    cy.get('.comment-actions button[title="Me encanta"]').should('be.visible');
  });

  it('debería reaccionar a un post con "Me gusta"', () => {
    // Hacer clic en el botón "Me gusta"
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');

    // Verificar que el contador se actualizó
    cy.get('.tema-meta .reaction-count[title="Me gusta"]').first().should('contain', '1');
    
    // Verificar que el botón está marcado como activo
    cy.get('.tema-actions button[title="Me gusta"]').first().should('have.class', 'active');
  });

  it('debería reaccionar a un post con "No me gusta"', () => {
    // Hacer clic en el botón "No me gusta"
    cy.get('.tema-actions button[title="No me gusta"]').first().click();
    cy.wait('@toggleReaction');

    // Verificar que el contador se actualizó
    cy.get('.tema-meta .reaction-count[title="No me gusta"]').first().should('contain', '1');
    
    // Verificar que el botón está marcado como activo
    cy.get('.tema-actions button[title="No me gusta"]').first().should('have.class', 'active');
  });

  it('debería cambiar de reacción en un post', () => {
    // Reaccionar primero con "Me gusta"
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');
    
    // Verificar que el contador de "Me gusta" se actualizó
    cy.get('.tema-meta .reaction-count[title="Me gusta"]').first().should('contain', '1');
    
    // Cambiar a "Me encanta"
    cy.get('.tema-actions button[title="Me encanta"]').first().click();
    cy.wait('@toggleReaction');
    
    // Verificar que el contador de "Me gusta" se restableció
    cy.get('.tema-meta .reaction-count[title="Me gusta"]').first().should('contain', '0');
    
    // Verificar que el contador de "Me encanta" se actualizó
    cy.get('.tema-meta .reaction-count[title="Me encanta"]').first().should('contain', '1');
    
    // Verificar que el botón "Me gusta" ya no está activo
    cy.get('.tema-actions button[title="Me gusta"]').first().should('not.have.class', 'active');
    
    // Verificar que el botón "Me encanta" está activo
    cy.get('.tema-actions button[title="Me encanta"]').first().should('have.class', 'active');
  });

  it('debería quitar la reacción de un post al hacer clic nuevamente', () => {
    // Reaccionar primero con "Me gusta"
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');
    
    // Verificar que el contador se actualizó
    cy.get('.tema-meta .reaction-count[title="Me gusta"]').first().should('contain', '1');
    
    // Quitar la reacción haciendo clic nuevamente
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');
    
    // Verificar que el contador se restableció
    cy.get('.tema-meta .reaction-count[title="Me gusta"]').first().should('contain', '0');
    
    // Verificar que el botón ya no está activo
    cy.get('.tema-actions button[title="Me gusta"]').first().should('not.have.class', 'active');
  });

  it('debería reaccionar a un comentario con "Me divierte"', () => {
    // Crear un comentario primero
    cy.get('.form-comentar textarea').first().type('Comentario para reacción divertida');
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.esperarCargaTemas();

    // Hacer clic en el botón "Me divierte"
    cy.get('.comment-actions button[title="Me divierte"]').first().click();
    cy.wait('@toggleReaction');

    // Verificar que el contador se actualizó
    cy.get('.comment-stats .reaction-count[title="Me divierte"]').first().should('contain', '1');
    
    // Verificar que el botón está marcado como activo
    cy.get('.comment-actions button[title="Me divierte"]').first().should('have.class', 'active');
  });

  it('debería mostrar todas las reacciones de un post', () => {
    // Reaccionar con diferentes tipos
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');
    
    cy.get('.tema-actions button[title="Me encanta"]').first().click();
    cy.wait('@toggleReaction');
    
    cy.get('.tema-actions button[title="Me divierte"]').first().click();
    cy.wait('@toggleReaction');

    // Hacer clic en el botón para ver todas las reacciones
    cy.get('.tema-meta .show-reactions').first().click();
    cy.wait('@getPostReactions');

    // Verificar que se muestra el modal de reacciones
    cy.get('.reactions-modal').should('be.visible');
    
    // Verificar que se muestran todas las reacciones
    cy.get('.reactions-modal .reaction-item').should('have.length', 3);
    
    // Verificar que se muestra el tipo de reacción correcto
    cy.get('.reactions-modal .reaction-item').should('contain', 'Me gusta');
    cy.get('.reactions-modal .reaction-item').should('contain', 'Me encanta');
    cy.get('.reactions-modal .reaction-item').should('contain', 'Me divierte');
    
    // Cerrar el modal
    cy.get('.reactions-modal .close-modal').click();
    cy.get('.reactions-modal').should('not.be.visible');
  });

  it('debería mostrar todas las reacciones de un comentario', () => {
    // Crear un comentario primero
    cy.get('.form-comentar textarea').first().type('Comentario para ver reacciones');
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.esperarCargaTemas();

    // Reaccionar con diferentes tipos
    cy.get('.comment-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');
    
    cy.get('.comment-actions button[title="Me sorprende"]').first().click();
    cy.wait('@toggleReaction');

    // Hacer clic en el botón para ver todas las reacciones
    cy.get('.comment-stats .show-reactions').first().click();
    cy.wait('@getCommentReactions');

    // Verificar que se muestra el modal de reacciones
    cy.get('.reactions-modal').should('be.visible');
    
    // Verificar que se muestran todas las reacciones
    cy.get('.reactions-modal .reaction-item').should('have.length', 2);
    
    // Cerrar el modal
    cy.get('.reactions-modal .close-modal').click();
    cy.get('.reactions-modal').should('not.be.visible');
  });

  it('debería mostrar los conteos de reacciones en el listado de posts', () => {
    // Reaccionar con diferentes tipos
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');
    
    cy.get('.tema-actions button[title="Me encanta"]').first().click();
    cy.wait('@toggleReaction');
    
    cy.get('.tema-actions button[title="Me divierte"]').first().click();
    cy.wait('@toggleReaction');

    // Verificar que se muestran los conteos en el listado
    cy.get('.tema-meta .reaction-count[title="Me gusta"]').first().should('contain', '0');
    cy.get('.tema-meta .reaction-count[title="Me encanta"]').first().should('contain', '1');
    cy.get('.tema-meta .reaction-count[title="Me divierte"]').first().should('contain', '1');
  });

  it('debería mostrar los conteos de reacciones en los comentarios', () => {
    // Crear un comentario primero
    cy.get('.form-comentar textarea').first().type('Comentario para conteos de reacciones');
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.esperarCargaTemas();

    // Reaccionar con diferentes tipos
    cy.get('.comment-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');
    
    cy.get('.comment-actions button[title="Me sorprende"]').first().click();
    cy.wait('@toggleReaction');

    // Verificar que se muestran los conteos en el comentario
    cy.get('.comment-stats .reaction-count[title="Me gusta"]').first().should('contain', '0');
    cy.get('.comment-stats .reaction-count[title="Me sorprende"]').first().should('contain', '1');
  });

  it('debería mostrar posts populares basados en reacciones', () => {
    // Reaccionar a varios posts
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReaction');
    
    // Verificar que la sección de posts populares está visible
    cy.get('.popular-posts').should('be.visible');
    cy.get('.popular-posts h3').should('contain', 'Posts Populares');
    
    // Verificar que hay posts populares
    cy.get('.popular-posts .popular-post').should('have.length.greaterThan', 0);
    
    // Verificar que se muestran los conteos de reacciones
    cy.get('.popular-posts .reaction-count').should('be.visible');
  });

  it('debería manejar errores de reacción', () => {
    // Mock para simular un error en la API
    cy.intercept('POST', '**/api/reactions/toggle', { 
      statusCode: 500, 
      body: { success: false, error: 'Error al guardar la reacción' } 
    }).as('toggleReactionError');

    // Intentar reaccionar
    cy.get('.tema-actions button[title="Me gusta"]').first().click();
    cy.wait('@toggleReactionError');

    // Verificar que se muestra un mensaje de error
    cy.get('.toast.error').should('be.visible');
    cy.get('.toast.error').should('contain', 'Error al guardar la reacción');
    
    // Verificar que el contador no se actualizó
    cy.get('.tema-meta .reaction-count[title="Me gusta"]').first().should('contain', '0');
    
    // Verificar que el botón no está activo
    cy.get('.tema-actions button[title="Me gusta"]').first().should('not.have.class', 'active');
  });
});