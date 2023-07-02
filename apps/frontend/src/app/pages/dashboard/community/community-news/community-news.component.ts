import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { BlogService } from '@momentum/frontend/data';
import { finalize } from 'rxjs/operators';
import { parse, simplify } from 'txml/dist/txml';

@Component({
  selector: 'mom-community-news',
  templateUrl: './community-news.component.html',
  styleUrls: ['./community-news.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CommunityNewsComponent implements OnInit {
  // The number of blog posts to display on this component
  readonly POSTS_DISPLAYED = 10;

  feed: { item: BlogPost[] };
  loaded: boolean;

  constructor(private blogService: BlogService) {
    this.feed = { item: [] };
    this.loaded = false;
  }

  ngOnInit() {
    this.blogService
      .getRecentBlogPosts()
      .pipe(finalize(() => (this.loaded = true)))
      .subscribe((response) => {
        response = parse(response, { noChildNodes: [] });
        response = simplify(response);
        this.feed = response.rss.channel;

        for (const post of this.feed.item) {
          post['content:encoded'] =
            post['content:encoded'].slice(0, 500) + '...';
          post.pubDate = post.pubDate.slice(0, -6);
        }
      });
  }
}

interface BlogPost {
  'content:encoded': string;
  description: string;
  guid: string;
  link: string;
  pubDate: string;
  title: string;
}
