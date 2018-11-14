import {Component, OnInit} from '@angular/core';
import {TumblrAPIService} from '../../../../@core/data/tumblr-api.service';
import {BlogPost} from '../../../../@core/models/blog-post.model';

@Component({
  selector: 'community-news',
  templateUrl: './community-news.component.html',
  styleUrls: ['./community-news.component.scss'],
})
export class CommunityNewsComponent implements OnInit {

  blogPosts: BlogPost[];
  loadedPosts: boolean;
  twitterData;
  twitterOpts;
  constructor(private tumblrAPI: TumblrAPIService) {
    this.blogPosts = [];
    this.loadedPosts = false;
    this.twitterData = {
      screenName: 'MomentumMod',
      sourceType: 'profile',
    };
    this.twitterOpts = {
      tweetLimit: 4,
      chrome: ['nofooter'],
      'theme': 'dark',
    };
  }

  ngOnInit() {
    this.tumblrAPI.getRecentBlogPosts().subscribe(resp => {
      if (resp.response && resp.response.posts) {
        for (const post of resp.response.posts) {
          this.blogPosts.push({
            title: post.title,
            post_url: post.post_url,
            text: post.body.substring(0, 500) + '...',
            timestamp: new Date(post.timestamp * 1000),
          });
        }
        this.loadedPosts = true;
      }
    });
  }

}
