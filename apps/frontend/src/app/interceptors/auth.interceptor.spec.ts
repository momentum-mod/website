import * as assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
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
import { of, Subject, throwError } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { AuthService } from '../services/data/auth.service';

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
            getAccessToken: mock.fn(),
            getRefreshToken: mock.fn(),
            isAccessTokenExpired: mock.fn(() => false),
            refreshAccessToken: mock.fn(),
            logout: mock.fn()
          }
        },
        {
          provide: DOCUMENT,
          useValue: {
            location: {
              origin: 'https://momentum-mod.org',
              host: 'momentum-mod.org'
            },
            querySelectorAll: (selector: string) =>
              document.querySelectorAll(selector)
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
    mock.restoreAll();
    TestBed.resetTestingModule();
  });

  it('should add an Authorization header with the access token when the request is to an allowed domain', () => {
    const accessToken = 'test-access-token';
    mock.method(authService, 'getAccessToken', () => accessToken);

    httpClient.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    assert.equal(
      req.request.headers.get('Authorization'),
      `Bearer ${accessToken}`
    );
  });

  it('should not add an Authorization header when the request is not to an allowed domain', () => {
    mock.method(authService, 'getAccessToken', () => 'test-access-token');

    httpClient.get('https://not-allowed.com/test').subscribe();

    const httpRequest = httpMock.expectOne('https://not-allowed.com/test');
    assert.equal(httpRequest.request.headers.has('Authorization'), false);
  });

  it('should handle a 401 error by attempting to refresh the access token', () => {
    mock.method(authService, 'getAccessToken', () => 'test-access-token');
    const refreshSpy = mock.method(authService, 'refreshAccessToken', () =>
      of('new-access-token')
    );

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    httpRequest.flush(
      null,
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );

    const refreshRequest = httpMock.expectOne('/test');
    assert.equal(
      refreshRequest.request.headers.get('Authorization'),
      'Bearer new-access-token'
    );
    assert.equal(refreshSpy.mock.callCount(), 1);
  });

  it('should get new access token if current one is missing but refresh token exists', () => {
    mock.method(authService, 'getAccessToken', () => null);
    mock.method(authService, 'getRefreshToken', () => 'refresh-token');
    const refreshSpy = mock.method(authService, 'refreshAccessToken', () =>
      of('new-access-token')
    );

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    assert.equal(
      httpRequest.request.headers.get('Authorization'),
      'Bearer new-access-token'
    );
    assert.equal(refreshSpy.mock.callCount(), 1);
  });

  it('should get new access token if current one is expired', () => {
    mock.method(authService, 'getAccessToken', () => 'expired-token');
    mock.method(authService, 'getRefreshToken', () => 'refresh-token');
    mock.method(authService, 'isAccessTokenExpired', () => true);
    const refreshSpy = mock.method(authService, 'refreshAccessToken', () =>
      of('new-access-token')
    );

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    assert.equal(
      httpRequest.request.headers.get('Authorization'),
      'Bearer new-access-token'
    );
    assert.equal(refreshSpy.mock.callCount(), 1);
  });

  it('should logout the user if the refresh token request responds with 401', () => {
    mock.method(authService, 'getAccessToken', () => 'test-access-token');
    mock.method(authService, 'refreshAccessToken', () =>
      throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
      )
    );
    const logoutSpy = mock.method(authService, 'logout');

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    httpRequest.flush(
      null,
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );

    assert.equal(logoutSpy.mock.callCount(), 1);
  });

  it('should handle multiple requests 401ing at once by only sending one refresh request and repeating the original requests with the new access token', () => {
    mock.method(authService, 'getAccessToken', () => 'test-access-token');

    const refreshSpy = mock.method(authService, 'refreshAccessToken');
    const refreshObservable = new Subject<string>();
    refreshSpy.mock.mockImplementationOnce(() => refreshObservable);

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

    assert.equal(refreshSpy.mock.callCount(), 1);

    refreshObservable.next('new-access-token');

    const refreshedReq1 = httpMock.expectOne('/test1');
    const refreshedReq2 = httpMock.expectOne('/test2');
    assert.equal(
      refreshedReq1.request.headers.get('Authorization'),
      'Bearer new-access-token'
    );
    assert.equal(
      refreshedReq2.request.headers.get('Authorization'),
      'Bearer new-access-token'
    );

    assert.equal(refreshSpy.mock.callCount(), 1);
  });

  it('should handle a failed refresh attempt by logging out the user', () => {
    mock.method(authService, 'getAccessToken', () => 'test-access-token');
    const refreshSpy = mock.method(authService, 'refreshAccessToken', () =>
      throwError(() => new Error('error'))
    );
    const logoutSpy = mock.method(authService, 'logout');

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    httpRequest.flush(
      null,
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    );

    assert.equal(refreshSpy.mock.callCount(), 1);
    assert.ok(logoutSpy.mock.callCount() > 0);
  });

  it('should not add an Authorization header if there is no access token', () => {
    mock.method(authService, 'getAccessToken', () => null);

    httpClient.get('/test').subscribe();

    const httpRequest = httpMock.expectOne('/test');
    assert.equal(httpRequest.request.headers.has('Authorization'), false);
  });

  it('should not attempt to refresh the access token if the error status is not 401', () => {
    mock.method(authService, 'getAccessToken', () => 'test-access-token');
    const refreshSpy = mock.method(authService, 'refreshAccessToken', () =>
      of('new-access-token')
    );

    httpClient.get('/test').subscribe({
      next: () => assert.fail('Should have failed with 404 error'),
      error: (error: HttpErrorResponse) => assert.equal(error.status, 400)
    });

    const httpRequest = httpMock.expectOne('/test');
    httpRequest.flush(
      null,
      new HttpErrorResponse({ status: 400, statusText: 'Unauthorized' })
    );

    httpMock.expectNone('/test');
    assert.equal(refreshSpy.mock.callCount(), 0);
  });
});
