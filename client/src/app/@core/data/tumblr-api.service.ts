import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class TumblrAPIService {
  constructor(private http: HttpClient) {}

  public getRecentBlogPosts(): Observable<any> {
    return this.http.get(
      'https://api.tumblr.com/v2/blog/t:o8UvszvUbvUG1cjgbz5Epg/posts',
      {
        params: {
          limit: '10',
          filter: 'text',
          api_key: 'lgxN5L8jWr0TUkNtwcHbVMVwGavy3lYzSQ6lY6oYfHDThTsAGg'
        }
      }
    );
  }
}
