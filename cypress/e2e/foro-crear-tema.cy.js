describe('Flujo de Creación de Tema', () => {
  beforeEach(() => {
    // Visitar la página del foro
    cy.visit('/#foro');
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    cy.get('.foro-controls').should('be.visible');
  });

  it('debería crear un nuevo tema exitosamente', () => {
    // Datos de prueba
    const titulo = 'Tema de prueba E2E';
    const contenido = 'Este es un tema de prueba creado con Cypress para verificar el funcionamiento del foro. Contiene más de 10 caracteres para cumplir con la validación.';
    const categoria = 'General';

    // Act: Crear el tema
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type(titulo);
    cy.get('#contenido-tema').type(contenido);
    cy.get('#categoria-tema').select(categoria);
    
    cy.get('#form-crear-tema button[type="submit"]').click();

    // Assert: Verificar que el tema se creó
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    cy.get('.tema').should('contain', titulo);
    cy.get('.tema').should('contain', contenido);
    
    // Verificar categoría
    cy.get('.category-badge').should('contain', categoria);
    
    // Verificar metadata
    cy.get('.tema-meta').should('contain', 'Autor:');
    cy.get('.tema-meta').should('contain', 'Fecha:');
  });

  it('debería validar título demasiado corto', () => {
    const titulo = 'Corto'; // Menos de 5 caracteres
    const contenido = 'Contenido válido con más de 10 caracteres';

    // Act: Intentar crear tema con título corto
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type(titulo);
    cy.get('#contenido-tema').type(contenido);
    
    cy.get('#form-crear-tema button[type="submit"]').click();

    // Assert: Verificar mensaje de error
    cy.get('@alert').should('contain', 'El título debe tener entre 5 y 200 caracteres');
    
    // Verificar que no se creó el tema
    cy.get('.temas-list').should('not.contain', titulo);
  });

  it('debería validar contenido demasiado corto', () => {
    const titulo = 'Título válido';
    const contenido = 'Corto'; // Menos de 10 caracteres

    // Act: Intentar crear tema con contenido corto
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type(titulo);
    cy.get('#contenido-tema').type(contenido);
    
    cy.get('#form-crear-tema button[type="submit"]').click();

    // Assert: Verificar mensaje de error
    cy.get('@alert').should('contain', 'El contenido debe tener entre 10 y 2000 caracteres');
    
    // Verificar que no se creó el tema
    cy.get('.temas-list').should('not.contain', titulo);
  });

  it('debería crear tema sin categoría', () => {
    const titulo = 'Tema sin categoría';
    const contenido = 'Este es un tema de prueba sin categoría para verificar que el sistema maneja correctamente este caso.';

    // Act: Crear tema sin seleccionar categoría
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type(titulo);
    cy.get('#contenido-tema').type(contenido);
    
    cy.get('#form-crear-tema button[type="submit"]').click();

    // Assert: Verificar que el tema se creó
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    cy.get('.tema').should('contain', titulo);
  });

  it('debería cancelar creación de tema', () => {
    const titulo = 'Tema para cancelar';
    const contenido = 'Este tema no debería crearse';

    // Act: Iniciar creación pero cancelar
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type(titulo);
    cy.get('#contenido-tema').type(contenido);
    
    cy.get('#cancelar-tema').click();

    // Assert: Verificar que el formulario se ocultó
    cy.get('#form-crear-tema').should('not.be.visible');
    
    // Verificar que no se creó el tema
    cy.get('.temas-list').should('not.contain', titulo);
  });
});

// Comandos personalizados de Cypress
Cypress.Commands.add('verificarMensajeExito', (message) => {
  cy.get('body').should('contain', message);
});

Cypress.Commands.add('esperarCargaTemas', () => {
  cy.get('.temas-list').should('be.visible');
  cy.get('.tema').should('have.length.greaterThan', 0);
});

// Mock para prompt y confirm
beforeEach(() => {
  cy.stub(window, 'prompt').callsFake((message) => {
    cy.wrap(message).as('prompt');
    return 'Respuesta de prueba E2E';
  });
  
  cy.stub(window, 'confirm').callsFake((message) => {
    cy.wrap(message).as('confirm');
    return true;
  });
  
  cy.stub(window, 'alert').callsFake((message) => {
    cy.wrap(message).as('alert');
  });
});