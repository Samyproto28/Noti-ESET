describe('Flujo de Creación de Comentarios', () => {
  beforeEach(() => {
    // Visitar la página del foro
    cy.visit('/#foro');
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    
    // Crear un tema de prueba si no existe
    cy.crearTemaTest('Tema para comentarios', 'Este tema es específicamente para probar la funcionalidad de comentarios en el foro.');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
  });

  it('debería crear un comentario exitosamente', () => {
    const comentario = 'Este es un comentario de prueba E2E';

    // Act: Crear comentario
    cy.get('.form-comentar textarea').first().type(comentario);
    cy.get('.form-comentar button[type="submit"]').first().click();

    // Assert: Verificar que el comentario se creó
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.get('.comentarios-section').should('contain', comentario);
    
    // Verificar metadata del comentario
    cy.get('.comment-meta').should('contain', 'Anónimo');
    cy.get('.comment-meta').should('contain', 'Fecha:');
  });

  it('debería rechazar comentarios vacíos', () => {
    // Act: Intentar crear comentario vacío
    cy.get('.form-comentar button[type="submit"]').first().click();

    // Assert: Verificar que el formulario no se envía
    cy.get('.form-comentar textarea').should('have.attr', 'required');
    
    // Verificar que no se creó ningún comentario
    cy.get('.comentarios-section').should('not.contain', '');
  });

  it('debería crear una respuesta anidada', () => {
    const comentario = 'Comentario principal';
    const respuesta = 'Respuesta al comentario principal';

    // Crear comentario principal primero
    cy.get('.form-comentar textarea').first().type(comentario);
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.esperarCargaTemas();

    // Act: Responder al comentario
    cy.get('.comentario .comment-actions button[title="Responder"]').first().click();
    cy.get('@prompt').should('contain', 'Escribe tu respuesta:');
    cy.get('@promptOk').click();
    cy.verificarMensajeExito('Respuesta creada exitosamente');
    
    cy.esperarCargaTemas();

    // Assert: Verificar estructura jerárquica
    cy.get('.comentarios-section').should('contain', comentario);
    cy.get('.comentarios-section').should('contain', respuesta);
    
    // Verificar indentación progresiva
    cy.get('.comentario.nivel-0').should('exist');
    cy.get('.comentario.nivel-1').should('exist');
  });

  it('debería crear múltiples niveles de respuestas', () => {
    const niveles = [
      'Comentario de nivel 0',
      'Respuesta de nivel 1',
      'Respuesta de nivel 2',
      'Respuesta de nivel 3'
    ];

    // Crear comentario principal
    cy.get('.form-comentar textarea').first().type(niveles[0]);
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.esperarCargaTemas();
    
    // Responder al primer comentario
    cy.get('.comentario.nivel-0 .comment-actions button[title="Responder"]').first().click();
    cy.get('@prompt').type(niveles[1]);
    cy.get('@promptOk').click();
    cy.verificarMensajeExito('Respuesta creada exitosamente');
    
    cy.wait(500);
    
    // Responder a la segunda respuesta
    cy.get('.comentario.nivel-1 .comment-actions button[title="Responder"]').first().click();
    cy.get('@prompt').type(niveles[2]);
    cy.get('@promptOk').click();
    cy.verificarMensajeExito('Respuesta creada exitosamente');
    
    cy.wait(500);
    
    // Responder a la tercera respuesta
    cy.get('.comentario.nivel-2 .comment-actions button[title="Responder"]').first().click();
    cy.get('@prompt').type(niveles[3]);
    cy.get('@promptOk').click();
    cy.verificarMensajeExito('Respuesta creada exitosamente');

    // Assert: Verificar estructura jerárquica
    cy.get('.comentarios-section').should('contain', niveles[0]);
    cy.get('.comentarios-section').should('contain', niveles[1]);
    cy.get('.comentarios-section').should('contain', niveles[2]);
    cy.get('.comentarios-section').should('contain', niveles[3]);
    
    // Verificar indentación progresiva
    cy.get('.comentario.nivel-0').should('have.css', 'margin-left', '0px');
    cy.get('.comentario.nivel-1').should('have.css', 'margin-left', '20px');
    cy.get('.comentario.nivel-2').should('have.css', 'margin-left', '40px');
    cy.get('.comentario.nivel-3').should('have.css', 'margin-left', '60px');
  });

  it('debería cancelar creación de respuesta', () => {
    // Act: Iniciar respuesta pero cancelar
    cy.get('.comentario .comment-actions button[title="Responder"]').first().click();
    cy.get('@prompt').should('contain', 'Escribe tu respuesta:');
    
    // Simular cancelación del prompt
    cy.window().then((win) => {
      win.prompt.callsFake(() => null);
    });
    
    cy.get('@prompt').type('Respuesta cancelada');
    cy.get('@promptOk').click();

    // Assert: Verificar que no se creó la respuesta
    cy.get('.comentario.nivel-1').should('not.exist');
  });

  it('debería editar un comentario existente', () => {
    const comentarioOriginal = 'Comentario para editar';
    const comentarioEditado = 'Comentario editado con Cypress';

    // Crear comentario primero
    cy.get('.form-comentar textarea').first().type(comentarioOriginal);
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.esperarCargaTemas();

    // Act: Editar comentario
    cy.get('.comentario .comment-actions .edit-btn').first().click();
    cy.get('@prompt').should('contain', 'Edita tu comentario:');
    cy.get('@prompt').clear().type(comentarioEditado);
    cy.get('@promptOk').click();

    // Assert: Verificar que el comentario se editó
    cy.verificarMensajeExito('Comentario actualizado exitosamente');
    cy.esperarCargaTemas();
    cy.get('.comentarios-section').should('not.contain', comentarioOriginal);
    cy.get('.comentarios-section').should('contain', comentarioEditado);
  });

  it('debería eliminar un comentario existente', () => {
    const comentario = 'Comentario para eliminar';

    // Crear comentario primero
    cy.get('.form-comentar textarea').first().type(comentario);
    cy.get('.form-comentar button[type="submit"]').first().click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    cy.esperarCargaTemas();

    // Act: Eliminar comentario
    cy.get('.comentario .comment-actions .delete-btn').first().click();
    cy.get('@confirm').should('contain', '¿Seguro que quieres eliminar este comentario?');
    cy.get('@confirmOk').click();

    // Assert: Verificar que el comentario se eliminó
    cy.verificarMensajeExito('Comentario eliminado exitosamente');
    cy.esperarCargaTemas();
    cy.get('.comentarios-section').should('not.contain', comentario);
  });
});

// Comandos personalizados de Cypress
Cypress.Commands.add('crearTemaTest', (titulo, contenido, categoria = null) => {
  cy.get('#btn-crear-tema').click();
  cy.get('#form-crear-tema').should('be.visible');
  
  cy.get('#titulo-tema').type(titulo);
  cy.get('#contenido-tema').type(contenido);
  
  if (categoria) {
    cy.get('#categoria-tema').select(categoria);
  }
  
  cy.get('#form-crear-tema button[type="submit"]').click();
});

Cypress.Commands.add('verificarMensajeExito', (message) => {
  cy.get('body').should('contain', message);
});

Cypress.Commands.add('esperarCargaTemas', () => {
  cy.get('.temas-list').should('be.visible');
  cy.get('.tema').should('have.length.greaterThan', 0);
});

// Mock para prompt y confirm
beforeEach(() => {
  cy.stub(window, 'prompt').callsFake((message, defaultValue) => {
    cy.wrap(message).as('prompt');
    if (defaultValue) {
      return defaultValue;
    }
    return 'Respuesta de prueba E2E';
  });
  
  cy.stub(window, 'confirm').callsFake((message) => {
    cy.wrap(message).as('confirm');
    return true;
  });
  
  cy.stub(window, 'alert').callsFake((message) => {
    cy.wrap(message).as('alert');
  });
  
  // Crear stub para promptOk y confirmOk
  cy.window().then((win) => {
    win.promptOk = cy.stub();
    win.confirmOk = cy.stub();
  });
});