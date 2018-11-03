// Run e2e tests with command ng e2e --port 49152 in the terminal while in the client folder

// app.e2e-spec.ts
import { NgHomePage } from './app.po';

describe('ng-home App', function() {
  let page: NgHomePage;

  beforeEach(() => {
    page = new NgHomePage();
  });

  it('should display heading talking about momentum', () => {
    page.navigateTo();
    expect(page.getHeadingText()).toEqual('A free, open source movement game based on Counter-Strike: Source physics.');
  });
/*
  it('should redirect to steam login page', () => {
    page.navigateToDash();
  });
*/
});
