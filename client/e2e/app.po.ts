
import { browser, element, by } from 'protractor';

export class NgHomePage {
  navigateTo() {
    // Navigate to the home page of the app
    return browser.get('/');
  }

  getHeadingText() {
    // Get the home page heading element reference
    // Takes parameters of the Selector and then the css obj name
    return element(by.css('ngx-header h2')).getText();
  }

  /*
 navigateToDash() {
   // Navigate the user to the dashboard page
   return browser.get('/dashboard');
 }
 navigateToMapLibrary() {
   return browser.get('/dashboard/maps/library', 10000);
 }
 */

}
