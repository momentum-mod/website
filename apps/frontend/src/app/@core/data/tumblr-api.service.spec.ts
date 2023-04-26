import { of } from 'rxjs';
import { TumblrAPIService } from './tumblr-api.service';

let httpClientSpy: { get: jasmine.Spy };
let tumblrAPIService: TumblrAPIService;

describe('TumblrAPIService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    tumblrAPIService = new TumblrAPIService(<any>httpClientSpy);
  });

  describe('Unit Tests', () => {
    it('#getRecentBlogPosts() should return followed recent posts', () => {
      httpClientSpy.get.and.returnValue(of(tumblrAPIService));
      tumblrAPIService
        .getRecentBlogPosts()
        .subscribe(
          (value) =>
            expect(value).toEqual(tumblrAPIService, 'expected activity'),
          fail
        );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
  });
});
