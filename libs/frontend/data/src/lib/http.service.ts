import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { env } from '@momentum/frontend/env';
import { QueryParam, QueryParamOptional } from '@momentum/constants';
import { Observable } from 'rxjs';

export interface BackendRequestOptions {
  body?: any;
  query?: QueryParamOptional;
  type?: 'api' | 'auth';
  version?: number;
  observe?: 'response' | 'events' | 'body';
  reportProgress?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

/**
 * A simple wrapper class for handling HTTP requests for the backend.
 *
 * The methods included on this service are by no means exhaustive, feel free to
 * add further mplementations/overloads if needed
 */
@Injectable({ providedIn: 'root' })
export class HttpService {
  constructor(private ngHttp: HttpClient) {}

  get<T>(url: string, options?: BackendRequestOptions): Observable<T> {
    return this.request<T>('GET', url, options);
  }

  post<T>(
    url: string,
    options: { observe: 'response' } & BackendRequestOptions
  ): Observable<HttpResponse<T>>;

  post(
    url: string,
    options: { observe: 'events'; responseType: 'text' } & BackendRequestOptions
  ): Observable<HttpResponse<string>>;

  post<T>(url: string, options?: BackendRequestOptions): Observable<T>;

  post(url: string, options?: BackendRequestOptions): Observable<any> {
    return this.request('POST', url, options);
  }

  patch(url: string, options?: BackendRequestOptions): Observable<void> {
    return this.request('PATCH', url, options);
  }

  put<T>(url: string, options?: BackendRequestOptions): Observable<T>;

  put(url: string, options?: BackendRequestOptions): Observable<void> {
    return this.request('PUT', url, options);
  }

  delete(url: string, options?: BackendRequestOptions): Observable<void> {
    return this.request('DELETE', url, options);
  }

  private request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options?: BackendRequestOptions
  ): Observable<T>;

  private request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options?: BackendRequestOptions & { observe: 'response' }
  ): Observable<HttpResponse<T>>;

  private request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    options?: BackendRequestOptions
  ): Observable<any> {
    return this.ngHttp.request(
      method,
      `${this.getBaseUrlString(options)}/${url}`,
      {
        body: options?.body,
        params: this.handleQuery(options?.query),
        observe: options?.observe,
        responseType: options?.responseType,
        reportProgress: options?.reportProgress
      }
    );
  }

  private getBaseUrlString(options?: BackendRequestOptions): string {
    if (options?.type === 'auth') {
      return env.auth;
    } else {
      const version = options?.version ?? 1;
      return `${env.api}/v${version}`;
    }
  }

  private handleQuery(query?: QueryParamOptional): QueryParam | undefined {
    return query
      ? (Object.fromEntries(
          Object.entries(query)
            .filter(([_, value]) => value !== undefined)
            .map(([name, value]) =>
              Array.isArray(value) ? [name, value.join(',')] : [name, value]
            )
        ) as QueryParam)
      : undefined;
  }
}
