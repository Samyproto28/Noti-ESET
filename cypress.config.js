const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      reportDir: 'cypress/reports',
      charts: true,
      reportPageTitle: 'Foro E2E Tests',
      embeddedScreenshots: true,
      inlineAssets: true
    },
    env: {
      apiUrl: 'http://localhost:4000/api',
      frontendUrl: 'http://localhost:3000'
    }
  }
});