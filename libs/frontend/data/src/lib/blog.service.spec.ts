import { of } from 'rxjs';
import { BlogService } from './blog.service';

let httpClientSpy: { get: jasmine.Spy };
let blogService: BlogService;

describe('MomBlogService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    blogService = new BlogService(<any>httpClientSpy);
  });

  describe('Unit Tests', () => {
    it('#getRecentBlogPosts() should return followed recent posts', () => {
      httpClientSpy.get.and.returnValue(of(blogService));
      blogService
        .getRecentBlogPosts()
        .subscribe(
          (value: any) =>
            expect(value).toEqual(blogService, 'expected activity'),
          fail
        );
      expect(httpClientSpy.get.calls.count()).toBe(1, 'one call');
    });
  });
});
