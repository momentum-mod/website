import {
  Component,
  OnInit,
  ViewEncapsulation,
  inject,
  signal
} from '@angular/core';
import { finalize } from 'rxjs/operators';
import { XMLParser } from 'fast-xml-parser';
import { BlogService } from '../../../services/data/blog.service';
import { CardComponent } from '../../../components/card/card.component';

@Component({
  selector: 'm-community-news',
  templateUrl: './community-news.component.html',
  styleUrls: ['./community-news.component.css'],
  imports: [CardComponent],
  encapsulation: ViewEncapsulation.None
})
export class CommunityNewsComponent implements OnInit {
  private readonly blogService = inject(BlogService);

  // The number of blog posts to display on this component
  readonly POSTS_DISPLAYED = 10;

  readonly feed = signal<{ item: BlogPost[] }>({ item: [] });
  readonly loaded = signal(false);

  parser = new XMLParser();

  ngOnInit() {
    this.blogService
      .getRecentBlogPosts()
      .pipe(finalize(() => this.loaded.set(true)))
      .subscribe((response) => {
        response = this.parser.parse(response);
        const feed: { item: BlogPost[] } = response.rss.channel;

        for (const post of feed.item) {
          post['content:encoded'] =
            post['content:encoded'].slice(0, 500) + '...';
          post.pubDate = post.pubDate.slice(0, -6);
        }

        this.feed.set(feed);
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
