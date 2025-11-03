// Importar comandos personalizados
import './commands';

// Configuración global para Cypress
beforeEach(() => {
  // Configurar interceptores para la API
  cy.intercept('GET', '**/api/forum/posts', { fixture: 'posts.json' }).as('getPosts');
  cy.intercept('POST', '**/api/forum/posts', { fixture: 'post.json' }).as('createPost');
  cy.intercept('POST', '**/api/forum/posts/*/comments', { fixture: 'comment.json' }).as('createComment');
  cy.intercept('POST', '**/api/forum/comments/*/replies', { fixture: 'reply.json' }).as('createReply');
  cy.intercept('PUT', '**/api/forum/posts/*/comments/*', { fixture: 'comment.json' }).as('updateComment');
  cy.intercept('DELETE', '**/api/forum/posts/*/comments/*', { success: true }).as('deleteComment');
  cy.intercept('DELETE', '**/api/forum/posts/*', { success: true }).as('deletePost');
});

// Manejo de errores globales
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignorar errores específicos que no afectan las pruebas
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  
  // Ignorar errores de React que no afectan las pruebas
  if (err.message.includes('Warning: ReactDOM.render is deprecated')) {
    return false;
  }
  
  // Para otros errores, fallar la prueba
  return true;
});

// Configuración de timeouts
Cypress.config('defaultCommandTimeout', 10000);
Cypress.config('requestTimeout', 10000);
Cypress.config('responseTimeout', 10000);