// Comandos personalizados para Cypress

// Comando para verificar mensajes de éxito
Cypress.Commands.add('verificarMensajeExito', (message) => {
  cy.get('body').should('contain', message);
});

// Comando para esperar la carga de temas
Cypress.Commands.add('esperarCargaTemas', () => {
  cy.get('.temas-list').should('be.visible');
  cy.get('.tema').should('have.length.greaterThan', 0);
});

// Comando para crear un tema de prueba
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

// Comando para crear un comentario de prueba
Cypress.Commands.add('crearComentarioTest', (contenido) => {
  cy.get('.form-comentar textarea').first().type(contenido);
  cy.get('.form-comentar button[type="submit"]').first().click();
});

// Comando para responder a un comentario
Cypress.Commands.add('responderComentarioTest', (respuesta, nivel = 0) => {
  cy.get(`.comentario.nivel-${nivel} .comment-actions button[title="Responder"]`).first().click();
  cy.get('@prompt').type(respuesta);
  cy.get('@promptOk').click();
});

// Comando para verificar la estructura jerárquica de comentarios
Cypress.Commands.add('verificarEstructuraJerarquica', (cantidadNiveles) => {
  for (let i = 0; i < cantidadNiveles; i++) {
    cy.get(`.comentario.nivel-${i}`).should('exist');
    cy.get(`.comentario.nivel-${i}`).should('have.css', 'margin-left', `${i * 20}px`);
  }
});

// Comando para verificar que no hay mensajes de error
Cypress.Commands.add('verificarSinErrores', () => {
  cy.get('.toast.error').should('not.exist');
  cy.get('.alert-danger').should('not.exist');
});

// Comando para verificar que hay mensajes de éxito
Cypress.Commands.add('verificarConExito', () => {
  cy.get('.toast.success').should('exist');
  cy.get('.alert-success').should('exist');
});

// Comando para esperar a que las peticiones se completen
Cypress.Commands.add('esperarPeticiones', () => {
  cy.wait('@getPosts');
  cy.wait('@createPost');
  cy.wait('@createComment');
});

// Comando para verificar la presencia de elementos de UI
Cypress.Commands.add('verificarElementosForo', () => {
  cy.get('#foro h2').should('contain', 'Foro de Noticias');
  cy.get('.foro-controls').should('be.visible');
  cy.get('.temas-list').should('be.visible');
  cy.get('#btn-crear-tema').should('be.visible');
});

// Comando para verificar que el formulario de creación funciona
Cypress.Commands.add('verificarFormularioCreacion', () => {
  cy.get('#btn-crear-tema').click();
  cy.get('#form-crear-tema').should('be.visible');
  cy.get('#titulo-tema').should('be.visible');
  cy.get('#contenido-tema').should('be.visible');
  cy.get('#form-crear-tema button[type="submit"]').should('be.visible');
  cy.get('#cancelar-tema').should('be.visible');
  
  cy.get('#cancelar-tema').click();
  cy.get('#form-crear-tema').should('not.be.visible');
});

// Comando para verificar el filtrado por categorías
Cypress.Commands.add('verificarFiltradoPorCategoria', () => {
  cy.get('#categoria-filtro').should('be.visible');
  cy.get('#categoria-filtro option').should('have.length.greaterThan', 1);
  
  // Seleccionar una categoría
  cy.get('#categoria-filtro').select('general');
  cy.get('@getPosts');
  
  // Verificar que la selección se mantiene
  cy.get('#categoria-filtro').should('have.value', 'general');
});

// Comando para verificar la búsqueda
Cypress.Commands.add('verificarBusqueda', () => {
  cy.get('#search-input').should('be.visible');
  
  // Realizar una búsqueda
  cy.get('#search-input').type('prueba');
  cy.wait(500);
  cy.get('@getPosts');
  
  // Limpiar búsqueda
  cy.get('#search-input').clear();
  cy.wait(500);
  cy.get('@getPosts');
});

// Comando para verificar la reacción a posts
Cypress.Commands.add('verificarReaccionPost', () => {
  cy.get('.tema-actions button[title="Me gusta"]').first().click();
  cy.wait('@getPosts');
  
  // Verificar que el contador se actualizó
  cy.get('.tema-meta span:contains("👍")').first().should('contain', '1');
});

// Comando para verificar la reacción a comentarios
Cypress.Commands.add('verificarReaccionComentario', () => {
  cy.get('.comment-actions button[title="Me gusta"]').first().click();
  cy.wait('@getPosts');
  
  // Verificar que el contador se actualizó
  cy.get('.comment-stats span:contains("👍")').first().should('contain', '1');
});

// Comando para verificar la paginación
Cypress.Commands.add('verificarPaginacion', () => {
  // Crear suficientes posts para probar paginación
  for (let i = 0; i < 25; i++) {
    cy.crearTemaTest(`Tema de prueba ${i}`, `Contenido del tema de prueba ${i}`);
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
  }
  
  // Verificar que hay más de una página
  cy.get('.pagination').should('be.visible');
  cy.get('.pagination button[aria-label="Siguiente"]').should('be.visible');
  
  // Navegar a la siguiente página
  cy.get('.pagination button[aria-label="Siguiente"]').click();
  cy.wait('@getPosts');
  
  // Verificar que estamos en la página 2
  cy.get('.pagination button[aria-current="page"]').should('contain', '2');
});

// Comando para verificar la accesibilidad
Cypress.Commands.add('verificarAccesibilidad', () => {
  // Verificar que los elementos tienen atributos aria
  cy.get('button[aria-label]').should('have.length.greaterThan', 0);
  cy.get('select[aria-label]').should('have.length.greaterThan', 0);
  cy.get('input[aria-label]').should('have.length.greaterThan', 0);
  
  // Verificar que hay enlaces accesibles
  cy.get('button[title]').should('have.length.greaterThan', 0);
});

// Comando para verificar el responsive design
Cypress.Commands.add('verificarResponsiveDesign', () => {
  // Verificar en modo móvil
  cy.viewport(375, 667);
  cy.get('.foro-controls').should('be.visible');
  cy.get('.tema').should('have.css', 'width').and('match', /100%/);  // Ancho completo en móvil
  
  // Verificar en modo tablet
  cy.viewport(768, 1024);
  cy.get('.foro-controls').should('be.visible');
  
  // Verificar en modo desktop
  cy.viewport(1280, 720);
  cy.get('.foro-controls').should('be.visible');
});