import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '@momentum/frontend/data';
import { of, Subject, throwError } from 'rxjs';
import { DOCUMENT } from '@angular/common';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        },
        {
          provide: AuthService,
          useValue: {
            getAccessToken: jest.fn(),
            refreshAccessToken: jest.fn(),
            logout: jest.fn()
          }
        },
        {
          provide: DOCUMENT,
          useValue: {
            location: {
              origin: 'https://momentum-mod.org',
              host: 'momentum-mod.org'
            },
            querySelectorAll: jest.fn // Needed to stifle errors during teardown
          }
        }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  it('should add an Authorization header with the access token when the request is to an allowed domain', () => {
    const accessToken = 'test-access-token';
    jest.spyOn(authService, 'getAccessToken').mockReturnValue(accessToken);

    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe(
      `Bearer ${accessToken}`
    );
  });

  it('should not add an Authorization header when the request is not to an allowed domain', () => {
    jest
      .spyOn(authService, 'getAccessToken')
      .mockReturnValue('test-access-token');

    httpClient.get('https://not-allowed.com/test').subscribe();

    const httpRequest = httpMock.expectOne('https://not-allowed.com/test');
    expect(httpRequest.request.headers.has('Authorization')).toBeFalsy();
  });

  it('should handle a 401 error by attempting to refresh the access token', () => {
    jest
      .spyOn(authService, 'getAccessToken')
      .mockReturnValue('test-access-token');
    const refreshSpy = jest
      .spyOn(authService, 'refreshAccessToken')
      .mockReturnValueOnce(of('new-access-token'));

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    httpRequest.flush(
      null,
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );

    const refreshRequest = httpMock.expectOne('/test');
    expect(refreshRequest.request.headers.get('Authorization')).toBe(
      'Bearer new-access-token'
    );
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('should logout the user if the refresh token request responds with 401', () => {
    jest
      .spyOn(authService, 'getAccessToken')
      .mockReturnValue('test-access-token');
    jest
      .spyOn(authService, 'refreshAccessToken')
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
        )
      );
    const logoutSpy = jest.spyOn(authService, 'logout');

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    httpRequest.flush(
      null,
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );

    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple requests 401ing at once by only sending one refresh request and repeating the original requests with the new access token', () => {
    jest
      .spyOn(authService, 'getAccessToken')
      .mockReturnValue('test-access-token');

    const refreshSpy = jest.spyOn(authService, 'refreshAccessToken');
    const refreshObservable = new Subject<string>();
    refreshSpy.mockReturnValueOnce(refreshObservable);

    httpClient.get('/test1').subscribe();
    httpClient.get('/test2').subscribe();

    const req1 = httpMock.expectOne('/test1');
    const req2 = httpMock.expectOne('/test2');

    req1.flush(
      null,
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );
    req2.flush(
      null,
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );

    expect(refreshSpy).toHaveBeenCalledTimes(1);

    refreshObservable.next('new-access-token');

    const refreshedReq1 = httpMock.expectOne('/test1');
    const refreshedReq2 = httpMock.expectOne('/test2');
    expect(refreshedReq1.request.headers.get('Authorization')).toBe(
      'Bearer new-access-token'
    );
    expect(refreshedReq2.request.headers.get('Authorization')).toBe(
      'Bearer new-access-token'
    );

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle a failed refresh attempt by logging out the user', () => {
    jest
      .spyOn(authService, 'getAccessToken')
      .mockReturnValue('test-access-token');
    jest
      .spyOn(authService, 'refreshAccessToken')
      .mockReturnValue(throwError(() => new Error('error')));
    jest.spyOn(authService, 'logout').mockImplementation();

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    httpRequest.flush(
      null,
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );

    expect(authService.logout).toHaveBeenCalled();
  });

  it('should not add an Authorization header if there is no access token', () => {
    jest.spyOn(authService, 'getAccessToken').mockReturnValue(null);

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    expect(httpRequest.request.headers.has('Authorization')).toBeFalsy();
  });

  it('should not attempt to refresh the access token if the error status is not 401', () => {
    jest
      .spyOn(authService, 'getAccessToken')
      .mockReturnValue('test-access-token');

    const refreshSpy = jest
      .spyOn(authService, 'refreshAccessToken')
      .mockReturnValueOnce(of('new-access-token'));

    httpClient.get('/test').subscribe({
      next: () => fail('Should have failed with 404 error'),
      error: (error: HttpErrorResponse) => expect(error.status).toEqual(400)
    });

    const httpRequest = httpMock.expectOne('/test');
    httpRequest.flush(
      null,
      new HttpErrorResponse({ status: 400, statusText: 'Unauthorized' })
    );

    httpMock.expectNone('/test');
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
