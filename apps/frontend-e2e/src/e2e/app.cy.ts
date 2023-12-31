describe('frontend', () => {
  it('should successfully load the dashboard home page', () => {
    // Not much of a test, but serves to stub frontend E2E testing for now,
    // and tests that the dashboard loads in a real browser without errors.
    cy.visit('/');

    // This will fail untilwe  add support for viewing the dashboard whilst
    // unauthenticated.
    cy.get('m-app > div:last').should('have.class', 'chungus');
  });
});
