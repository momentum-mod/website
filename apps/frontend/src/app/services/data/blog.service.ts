import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private http = inject(HttpClient);

  public getRecentBlogPosts(): Observable<any> {
    return this.http.get('https://blog.momentum-mod.org/index.xml', {
      responseType: 'text'
    });
  }
}
