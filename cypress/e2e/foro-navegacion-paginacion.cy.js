describe('Navegación y Paginación del Foro', () => {
  beforeEach(() => {
    // Visitar la página del foro
    cy.visit('/#foro');
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    cy.get('.foro-controls').should('be.visible');
  });

  it('debería mostrar los controles de paginación', () => {
    // Verificar que los controles de paginación estén visibles
    cy.get('.pagination').should('be.visible');
    cy.get('.pagination button[aria-label="Anterior"]').should('be.visible');
    cy.get('.pagination button[aria-label="Siguiente"]').should('be.visible');
    cy.get('.pagination button[aria-current="page"]').should('contain', '1');
  });

  it('debería navegar a la página siguiente', () => {
    // Crear suficientes posts para tener múltiples páginas
    for (let i = 0; i < 25; i++) {
      cy.crearTemaTest(`Tema de prueba ${i}`, `Contenido del tema de prueba ${i}`);
      cy.verificarMensajeExito('Tema creado exitosamente');
      cy.esperarCargaTemas();
    }

    // Hacer clic en el botón de siguiente página
    cy.get('.pagination button[aria-label="Siguiente"]').click();
    cy.wait('@getPosts');

    // Verificar que estamos en la página 2
    cy.get('.pagination button[aria-current="page"]').should('contain', '2');
    
    // Verificar que los botones de anterior y siguiente están visibles
    cy.get('.pagination button[aria-label="Anterior"]').should('be.visible');
    cy.get('.pagination button[aria-label="Siguiente"]').should('be.visible');
  });

  it('debería navegar a la página anterior', () => {
    // Crear suficientes posts para tener múltiples páginas
    for (let i = 0; i < 25; i++) {
      cy.crearTemaTest(`Tema de prueba ${i}`, `Contenido del tema de prueba ${i}`);
      cy.verificarMensajeExito('Tema creado exitosamente');
      cy.esperarCargaTemas();
    }

    // Ir a la página 2
    cy.get('.pagination button[aria-label="Siguiente"]').click();
    cy.wait('@getPosts');

    // Volver a la página 1
    cy.get('.pagination button[aria-label="Anterior"]').click();
    cy.wait('@getPosts');

    // Verificar que estamos de vuelta en la página 1
    cy.get('.pagination button[aria-current="page"]').should('contain', '1');
    
    // Verificar que el botón de anterior está deshabilitado
    cy.get('.pagination button[aria-label="Anterior"]').should('be.disabled');
  });

  it('debería cambiar el número de posts por página', () => {
    // Verificar que el selector de posts por página está visible
    cy.get('#posts-per-page').should('be.visible');
    
    // Cambiar a 10 posts por página
    cy.get('#posts-per-page').select('10');
    cy.wait('@getPosts');
    
    // Verificar que se muestra el número correcto de posts
    cy.get('.tema').should('have.length.at.most', 10);
    
    // Cambiar a 50 posts por página
    cy.get('#posts-per-page').select('50');
    cy.wait('@getPosts');
    
    // Verificar que se muestra el número correcto de posts
    cy.get('.tema').should('have.length.at.most', 50);
  });

  it('debería ordenar los posts por diferentes criterios', () => {
    // Crear posts con diferentes fechas y títulos
    cy.crearTemaTest('Tema A', 'Contenido del tema A');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    cy.crearTemaTest('Tema B', 'Contenido del tema B');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Verificar que el selector de ordenamiento está visible
    cy.get('#sort-by').should('be.visible');
    
    // Ordenar por título (ascendente)
    cy.get('#sort-by').select('title_asc');
    cy.wait('@getPosts');
    
    // Verificar que los posts están ordenados por título
    cy.get('.tema:first').should('contain', 'Tema A');
    cy.get('.tema:last').should('contain', 'Tema B');
    
    // Ordenar por título (descendente)
    cy.get('#sort-by').select('title_desc');
    cy.wait('@getPosts');
    
    // Verificar que los posts están ordenados por título en orden inverso
    cy.get('.tema:first').should('contain', 'Tema B');
    cy.get('.tema:last').should('contain', 'Tema A');
    
    // Ordenar por fecha de creación (más reciente primero)
    cy.get('#sort-by').select('created_at_desc');
    cy.wait('@getPosts');
    
    // Verificar que los posts están ordenados por fecha
    cy.get('.tema:first').should('contain', 'Tema B');
    cy.get('.tema:last').should('contain', 'Tema A');
  });

  it('debería filtrar posts por categoría', () => {
    // Crear posts en diferentes categorías
    cy.crearTemaTest('Tema General', 'Contenido del tema general', 'General');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    cy.crearTemaTest('Tema Técnico', 'Contenido del tema técnico', 'Technical');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Verificar que el filtro de categorías está visible
    cy.get('#category-filter').should('be.visible');
    
    // Filtrar por categoría General
    cy.get('#category-filter').select('General');
    cy.wait('@getPosts');
    
    // Verificar que solo se muestran posts de la categoría General
    cy.get('.tema').should('contain', 'Tema General');
    cy.get('.tema').should('not.contain', 'Tema Técnico');
    
    // Filtrar por categoría Technical
    cy.get('#category-filter').select('Technical');
    cy.wait('@getPosts');
    
    // Verificar que solo se muestran posts de la categoría Technical
    cy.get('.tema').should('contain', 'Tema Técnico');
    cy.get('.tema').should('not.contain', 'Tema General');
    
    // Mostrar todas las categorías
    cy.get('#category-filter').select('all');
    cy.wait('@getPosts');
    
    // Verificar que se muestran posts de todas las categorías
    cy.get('.tema').should('contain', 'Tema General');
    cy.get('.tema').should('contain', 'Tema Técnico');
  });

  it('debería buscar posts', () => {
    // Crear posts para buscar
    cy.crearTemaTest('Tema sobre Cypress', 'Contenido del tema sobre Cypress');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    cy.crearTemaTest('Tema sobre JavaScript', 'Contenido del tema sobre JavaScript');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Verificar que el campo de búsqueda está visible
    cy.get('#search-input').should('be.visible');
    
    // Buscar "Cypress"
    cy.get('#search-input').type('Cypress');
    cy.wait(500); // Esperar a que se complete la búsqueda
    cy.wait('@getPosts');
    
    // Verificar que solo se muestran posts que contienen "Cypress"
    cy.get('.tema').should('contain', 'Tema sobre Cypress');
    cy.get('.tema').should('not.contain', 'Tema sobre JavaScript');
    
    // Limpiar la búsqueda
    cy.get('#search-input').clear();
    cy.wait(500);
    cy.wait('@getPosts');
    
    // Verificar que se muestran todos los posts
    cy.get('.tema').should('contain', 'Tema sobre Cypress');
    cy.get('.tema').should('contain', 'Tema sobre JavaScript');
  });

  it('debería navegar a un tema específico', () => {
    // Crear un tema
    cy.crearTemaTest('Tema para navegación', 'Contenido del tema para navegación');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Hacer clic en el título del tema
    cy.get('.tema-title').contains('Tema para navegación').click();
    cy.wait('@getPost');
    
    // Verificar que se muestra la página del tema
    cy.get('.post-detail').should('be.visible');
    cy.get('.post-detail h1').should('contain', 'Tema para navegación');
    cy.get('.post-detail .post-content').should('contain', 'Contenido del tema para navegación');
    
    // Verificar que hay un botón para volver al listado
    cy.get('.back-to-list').should('be.visible');
  });

  it('debería volver al listado desde un tema', () => {
    // Crear un tema
    cy.crearTemaTest('Tema para volver', 'Contenido del tema para volver');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // Navegar al tema
    cy.get('.tema-title').contains('Tema para volver').click();
    cy.wait('@getPost');
    
    // Volver al listado
    cy.get('.back-to-list').click();
    cy.wait('@getPosts');
    
    // Verificar que estamos de vuelta en el listado
    cy.get('.temas-list').should('be.visible');
    cy.get('.tema').should('contain', 'Tema para volver');
  });

  it('debería mostrar posts populares', () => {
    // Verificar que la sección de posts populares está visible
    cy.get('.popular-posts').should('be.visible');
    cy.get('.popular-posts h3').should('contain', 'Posts Populares');
    
    // Verificar que hay posts populares
    cy.get('.popular-posts .popular-post').should('have.length.greaterThan', 0);
  });

  it('debería mostrar estadísticas del foro', () => {
    // Verificar que las estadísticas del foro están visibles
    cy.get('.forum-stats').should('be.visible');
    cy.get('.forum-stats .stat-item').should('have.length.greaterThan', 0);
    
    // Verificar que hay estadísticas de posts
    cy.get('.forum-stats').should('contain', 'Posts');
    
    // Verificar que hay estadísticas de comentarios
    cy.get('.forum-stats').should('contain', 'Comentarios');
  });
});