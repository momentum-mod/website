import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { XMLParser } from 'fast-xml-parser';
import { SharedModule } from '../../../shared.module';
import { BlogService } from '../../../services/data/blog.service';

@Component({
  selector: 'm-community-news',
  templateUrl: './community-news.component.html',
  styleUrls: ['./community-news.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SharedModule]
})
export class CommunityNewsComponent implements OnInit {
  // The number of blog posts to display on this component
  readonly POSTS_DISPLAYED = 10;

  feed: { item: BlogPost[] } = { item: [] };
  loaded = false;

  parser = new XMLParser();

  constructor(private readonly blogService: BlogService) {}

  ngOnInit() {
    this.blogService
      .getRecentBlogPosts()
      .pipe(finalize(() => (this.loaded = true)))
      .subscribe((response) => {
        response = this.parser.parse(response);
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
