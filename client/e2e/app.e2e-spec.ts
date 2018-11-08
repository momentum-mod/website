// Run e2e tests with command ng e2e --port 49152 in the terminal while in the client folder

// app.e2e-spec.ts
import {NgHomePage} from './app.po';
// import {browser, protractor} from 'protractor';

/*
import {MapsService} from '../src/app/@core/data/maps.service';
import {LocalUserService} from '../src/app/@core/data/local-user.service';
import {AuthService} from '../src/app/@core/data/auth.service';
import { CookieService } from 'ngx-cookie-service';
import { JwtHelperService } from '@auth0/angular-jwt';

import {of} from 'rxjs';
import {MomentumMap} from '../src/app/@core/models/momentum-map.model';
import {User} from '../src/app/@core/models/user.model';

let httpClientSpy: { get: jasmine.Spy, patch: jasmine.Spy };
let mapsService: MapsService;
let localUserService: LocalUserService;
let cookieService: CookieService;
let authService: AuthService;
*/

describe('ng-home App', function() {
  let page: NgHomePage;

  beforeEach(() => {
    page = new NgHomePage();
    // httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'patch']);
    // cookieService = new CookieService(page);
    // authService = new AuthService(cookieService);
    // localUserService = new LocalUserService(authService, <any> httpClientSpy);
    // mapsService = new MapsService(<any> httpClientSpy);

  });

  it('should display heading talking about momentum', () => {
    page.navigateTo();
    expect(page.getHeadingText()).toEqual('A free, open source movement game based on Counter-Strike: Source physics.');
  });

  /*
  it('should redirect to /#about', () => {
    page.getNavAbout().click();
    const expectCond = protractor.ExpectedConditions;
    browser.wait(expectCond.urlContains('/about'), 4000).then(res => {
      expect(res).toEqual(true);
    });
  });
*/
});


/*
  it('should take user to map page ', () => {
    const expectedMaps: MomentumMap[] = [
      {
        id: '9',
        name: 'testmap1',
        statusFlag: 0,
        createdAt: new Date(),
      },
      {
        id: '40000',
        name: 'testmap2',
        statusFlag: 0,
        createdAt: new Date(),
      },
    ];
 //   const testUser: User[] = [
 //     {
  //      id: '2759389285395352',
  //      permissions: 0,
  //    },
  //  ];
    httpClientSpy.get.and.returnValue(of(expectedMaps));

    mapsService.searchMaps('whatever').subscribe(value =>
        expect(value).toEqual(expectedMaps, 'expected maps == 3'),
      fail,
    );
    expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');

  });

  it('should redirect to map library page', () => {
    page.navigateToMapLibrary();
  });
  */
