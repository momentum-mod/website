describe('frontend', () => {
  it('should display welcome message', () => {
    // Not much of a test, but serves to stub frontend E2E testing for now,
    // and tests that the frontmatter site displays in a real browser
    // without errors.
    cy.visit('/');
    cy.get('header h2').should('contain', 'movement');
    cy.get('header h2').should('not.contain', 'smovement');
  });
});
