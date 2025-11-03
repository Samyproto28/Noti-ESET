describe('Flujo Completo del Foro', () => {
  beforeEach(() => {
    // Visitar la página principal
    cy.visit('/');
    
    // Navegar a la sección del foro
    cy.get('nav a[href="#foro"]').click();
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    cy.get('.foro-controls').should('be.visible');
  });

  it('debería permitir el flujo completo de crear un tema, comentar y reaccionar', () => {
    // 1. Crear un nuevo tema
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type('Tema de prueba para flujo completo');
    cy.get('#contenido-tema').type('Este es un tema de prueba para verificar el flujo completo de creación, comentario y reacción en el foro.');
    cy.get('#categoria-tema').select('General');
    
    cy.get('#form-crear-tema button[type="submit"]').click();
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // 2. Verificar que el tema aparece en el listado
    cy.get('.tema').should('contain', 'Tema de prueba para flujo completo');
    
    // 3. Navegar al detalle del tema
    cy.get('.tema-title').contains('Tema de prueba para flujo completo').click();
    cy.wait('@getPost');
    
    cy.get('.post-detail').should('be.visible');
    cy.get('.post-detail h1').should('contain', 'Tema de prueba para flujo completo');
    cy.get('.post-detail .post-content').should('contain', 'Este es un tema de prueba para verificar el flujo completo');
    
    // 4. Añadir un comentario al tema
    cy.get('.form-comentar textarea').type('Este es un comentario de prueba para el flujo completo.');
    cy.get('.form-comentar button[type="submit"]').click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    
    // 5. Verificar que el comentario aparece
    cy.get('.comentario').should('contain', 'Este es un comentario de prueba para el flujo completo');
    
    // 6. Reaccionar al tema
    cy.get('.post-actions button[title="Me gusta"]').click();
    cy.wait('@toggleReaction');
    
    // 7. Verificar que la reacción se registró
    cy.get('.post-stats .reaction-count[title="Me gusta"]').should('contain', '1');
    cy.get('.post-actions button[title="Me gusta"]').should('have.class', 'active');
    
    // 8. Reaccionar al comentario
    cy.get('.comment-actions button[title="Me encanta"]').click();
    cy.wait('@toggleReaction');
    
    // 9. Verificar que la reacción al comentario se registró
    cy.get('.comment-stats .reaction-count[title="Me encanta"]').should('contain', '1');
    cy.get('.comment-actions button[title="Me encanta"]').should('have.class', 'active');
    
    // 10. Responder al comentario
    cy.get('.comment-actions button[title="Responder"]').first().click();
    cy.get('@prompt').type('Esta es una respuesta al comentario de prueba.');
    cy.get('@promptOk').click();
    cy.verificarMensajeExito('Respuesta creada exitosamente');
    
    // 11. Verificar que la respuesta aparece
    cy.get('.comentario.nivel-1').should('contain', 'Esta es una respuesta al comentario de prueba.');
    
    // 12. Volver al listado de temas
    cy.get('.back-to-list').click();
    cy.wait('@getPosts');
    
    // 13. Verificar que estamos de vuelta en el listado
    cy.get('.temas-list').should('be.visible');
    cy.get('.tema').should('contain', 'Tema de prueba para flujo completo');
    
    // 14. Buscar el tema creado
    cy.get('#search-input').type('flujo completo');
    cy.wait(500);
    cy.wait('@getPosts');
    
    // 15. Verificar que solo aparece el tema buscado
    cy.get('.tema').should('have.length', 1);
    cy.get('.tema').should('contain', 'Tema de prueba para flujo completo');
    
    // 16. Limpiar la búsqueda
    cy.get('#search-input').clear();
    cy.wait(500);
    cy.wait('@getPosts');
  });

  it('debería permitir el flujo completo de registro, login y participación en el foro', () => {
    // 1. Navegar a la página de registro
    cy.get('nav a[href="#auth"]').click();
    cy.get('#auth h2').should('contain', 'Autenticación');
    
    // 2. Cambiar a la pestaña de registro
    cy.get('#auth-tabs button[data-tab="register"]').click();
    cy.get('#register-form').should('be.visible');
    
    // 3. Completar el formulario de registro
    const username = `testuser${Date.now()}`;
    const email = `test${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    
    cy.get('#register-username').type(username);
    cy.get('#register-email').type(email);
    cy.get('#register-password').type(password);
    cy.get('#register-confirm-password').type(password);
    
    // 4. Enviar el formulario de registro
    cy.get('#register-form button[type="submit"]').click();
    cy.verificarMensajeExito('Registro exitoso');
    
    // 5. Verificar que el usuario está autenticado
    cy.get('#user-menu').should('be.visible');
    cy.get('#user-menu').should('contain', username);
    
    // 6. Navegar al foro
    cy.get('nav a[href="#foro"]').click();
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    
    // 7. Crear un tema como usuario autenticado
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type('Tema creado por usuario autenticado');
    cy.get('#contenido-tema').type('Este tema fue creado por un usuario autenticado para probar el flujo completo.');
    cy.get('#categoria-tema').select('General');
    
    cy.get('#form-crear-tema button[type="submit"]').click();
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // 8. Verificar que el tema aparece con el nombre de usuario
    cy.get('.tema').should('contain', 'Tema creado por usuario autenticado');
    cy.get('.tema').should('contain', username);
    
    // 9. Cerrar sesión
    cy.get('#user-menu').click();
    cy.get('#logout-button').click();
    cy.verificarMensajeExito('Sesión cerrada exitosamente');
    
    // 10. Verificar que el usuario ya no está autenticado
    cy.get('#user-menu').should('not.exist');
    cy.get('#login-button').should('be.visible');
    
    // 11. Iniciar sesión
    cy.get('nav a[href="#auth"]').click();
    cy.get('#auth h2').should('contain', 'Autenticación');
    
    cy.get('#login-username').type(username);
    cy.get('#login-password').type(password);
    
    cy.get('#login-form button[type="submit"]').click();
    cy.verificarMensajeExito('Inicio de sesión exitoso');
    
    // 12. Verificar que el usuario está autenticado nuevamente
    cy.get('#user-menu').should('be.visible');
    cy.get('#user-menu').should('contain', username);
    
    // 13. Navegar al foro y verificar que el tema creado sigue visible
    cy.get('nav a[href="#foro"]').click();
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    
    cy.get('.tema').should('contain', 'Tema creado por usuario autenticado');
    cy.get('.tema').should('contain', username);
  });

  it('debería permitir el flujo completo de edición y eliminación de contenido', () => {
    // 1. Crear un tema
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type('Tema para editar y eliminar');
    cy.get('#contenido-tema').type('Este tema será editado y eliminado para probar el flujo completo.');
    cy.get('#categoria-tema').select('General');
    
    cy.get('#form-crear-tema button[type="submit"]').click();
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // 2. Navegar al detalle del tema
    cy.get('.tema-title').contains('Tema para editar y eliminar').click();
    cy.wait('@getPost');
    
    // 3. Editar el tema
    cy.get('.post-actions button[title="Editar"]').click();
    cy.get('#edit-post-form').should('be.visible');
    
    cy.get('#edit-post-title').clear().type('Tema editado para prueba');
    cy.get('#edit-post-content').clear().type('Este tema ha sido editado para probar el flujo completo de edición.');
    
    cy.get('#edit-post-form button[type="submit"]').click();
    cy.verificarMensajeExito('Tema actualizado exitosamente');
    
    // 4. Verificar que los cambios se aplicaron
    cy.get('.post-detail h1').should('contain', 'Tema editado para prueba');
    cy.get('.post-detail .post-content').should('contain', 'Este tema ha sido editado para probar el flujo completo de edición.');
    
    // 5. Añadir un comentario
    cy.get('.form-comentar textarea').type('Comentario para editar y eliminar');
    cy.get('.form-comentar button[type="submit"]').click();
    cy.verificarMensajeExito('Comentario creado exitosamente');
    
    // 6. Editar el comentario
    cy.get('.comment-actions button[title="Editar"]').first().click();
    cy.get('#edit-comment-form').should('be.visible');
    
    cy.get('#edit-comment-content').clear().type('Comentario editado para prueba');
    
    cy.get('#edit-comment-form button[type="submit"]').click();
    cy.verificarMensajeExito('Comentario actualizado exitosamente');
    
    // 7. Verificar que los cambios del comentario se aplicaron
    cy.get('.comentario').should('contain', 'Comentario editado para prueba');
    
    // 8. Eliminar el comentario
    cy.get('.comment-actions button[title="Eliminar"]').first().click();
    cy.get('@prompt').should('contain', '¿Estás seguro de que deseas eliminar este comentario?');
    cy.get('@promptOk').click();
    cy.verificarMensajeExito('Comentario eliminado exitosamente');
    
    // 9. Verificar que el comentario fue eliminado
    cy.get('.comentario').should('not.contain', 'Comentario editado para prueba');
    
    // 10. Volver al listado
    cy.get('.back-to-list').click();
    cy.wait('@getPosts');
    
    // 11. Eliminar el tema
    cy.get('.tema-actions button[title="Eliminar"]').first().click();
    cy.get('@prompt').should('contain', '¿Estás seguro de que deseas eliminar este tema?');
    cy.get('@promptOk').click();
    cy.verificarMensajeExito('Tema eliminado exitosamente');
    
    // 12. Verificar que el tema fue eliminado
    cy.get('.tema').should('not.contain', 'Tema editado para prueba');
  });

  it('debería permitir el flujo completo de filtrado, búsqueda y ordenamiento', () => {
    // 1. Crear varios temas en diferentes categorías
    cy.crearTemaTest('Tema General 1', 'Contenido del tema general 1', 'General');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    cy.crearTemaTest('Tema Técnico 1', 'Contenido del tema técnico 1', 'Technical');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    cy.crearTemaTest('Tema General 2', 'Contenido del tema general 2', 'General');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    cy.crearTemaTest('Tema Técnico 2', 'Contenido del tema técnico 2', 'Technical');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // 2. Filtrar por categoría General
    cy.get('#category-filter').select('General');
    cy.wait('@getPosts');
    
    // 3. Verificar que solo se muestran temas de la categoría General
    cy.get('.tema').should('contain', 'Tema General 1');
    cy.get('.tema').should('contain', 'Tema General 2');
    cy.get('.tema').should('not.contain', 'Tema Técnico 1');
    cy.get('.tema').should('not.contain', 'Tema Técnico 2');
    
    // 4. Filtrar por categoría Technical
    cy.get('#category-filter').select('Technical');
    cy.wait('@getPosts');
    
    // 5. Verificar que solo se muestran temas de la categoría Technical
    cy.get('.tema').should('contain', 'Tema Técnico 1');
    cy.get('.tema').should('contain', 'Tema Técnico 2');
    cy.get('.tema').should('not.contain', 'Tema General 1');
    cy.get('.tema').should('not.contain', 'Tema General 2');
    
    // 6. Mostrar todas las categorías
    cy.get('#category-filter').select('all');
    cy.wait('@getPosts');
    
    // 7. Buscar temas que contengan "General"
    cy.get('#search-input').type('General');
    cy.wait(500);
    cy.wait('@getPosts');
    
    // 8. Verificar que solo se muestran temas que contienen "General"
    cy.get('.tema').should('contain', 'Tema General 1');
    cy.get('.tema').should('contain', 'Tema General 2');
    cy.get('.tema').should('not.contain', 'Tema Técnico 1');
    cy.get('.tema').should('not.contain', 'Tema Técnico 2');
    
    // 9. Limpiar la búsqueda
    cy.get('#search-input').clear();
    cy.wait(500);
    cy.wait('@getPosts');
    
    // 10. Ordenar por título (ascendente)
    cy.get('#sort-by').select('title_asc');
    cy.wait('@getPosts');
    
    // 11. Verificar que los temas están ordenados por título
    cy.get('.tema:first').should('contain', 'Tema General 1');
    cy.get('.tema:last').should('contain', 'Tema Técnico 2');
    
    // 12. Ordenar por título (descendente)
    cy.get('#sort-by').select('title_desc');
    cy.wait('@getPosts');
    
    // 13. Verificar que los temas están ordenados por título en orden inverso
    cy.get('.tema:first').should('contain', 'Tema Técnico 2');
    cy.get('.tema:last').should('contain', 'Tema General 1');
    
    // 14. Ordenar por fecha de creación (más reciente primero)
    cy.get('#sort-by').select('created_at_desc');
    cy.wait('@getPosts');
    
    // 15. Verificar que los temas están ordenados por fecha
    cy.get('.tema:first').should('contain', 'Tema Técnico 2');
    cy.get('.tema:last').should('contain', 'Tema General 1');
  });

  it('debería permitir el flujo completo de navegación entre secciones', () => {
    // 1. Empezar en la página principal
    cy.visit('/');
    cy.get('main h1').should('be.visible');
    
    // 2. Navegar a la sección de noticias
    cy.get('nav a[href="#news"]').click();
    cy.get('#news h2').should('contain', 'Noticias');
    
    // 3. Navegar a la sección del foro
    cy.get('nav a[href="#foro"]').click();
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    
    // 4. Crear un tema
    cy.crearTemaTest('Tema para navegación', 'Este tema es para probar la navegación entre secciones.');
    cy.verificarMensajeExito('Tema creado exitosamente');
    cy.esperarCargaTemas();
    
    // 5. Navegar al detalle del tema
    cy.get('.tema-title').contains('Tema para navegación').click();
    cy.wait('@getPost');
    
    // 6. Volver al listado de temas
    cy.get('.back-to-list').click();
    cy.wait('@getPosts');
    
    // 7. Navegar a la sección de autenticación
    cy.get('nav a[href="#auth"]').click();
    cy.get('#auth h2').should('contain', 'Autenticación');
    
    // 8. Volver a la sección del foro
    cy.get('nav a[href="#foro"]').click();
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    
    // 9. Verificar que el tema creado sigue visible
    cy.get('.tema').should('contain', 'Tema para navegación');
    
    // 10. Navegar a la página principal
    cy.get('nav a[href="#home"]').click();
    cy.get('main h1').should('be.visible');
    
    // 11. Navegar directamente al foro mediante la URL
    cy.visit('/#foro');
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
    
    // 12. Verificar que el tema creado sigue visible
    cy.get('.tema').should('contain', 'Tema para navegación');
  });
});