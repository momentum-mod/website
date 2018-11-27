import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CommunityNewsComponent} from './community-news.component';
import {NbCardModule} from '@nebular/theme';
import {NgxTwitterTimelineModule} from 'ngx-twitter-timeline';
import {TumblrAPIService} from '../../../../@core/data/tumblr-api.service';
import {of} from 'rxjs';
import {BlogPost} from '../../../../@core/models/blog-post.model';

describe('CommunityNewsComponent', () => {
  let component: CommunityNewsComponent;
  let fixture: ComponentFixture<CommunityNewsComponent>;

  let tumblrAPIStub: Partial<TumblrAPIService>;
  beforeEach(async(() => {
    const blogPost: BlogPost = {
      title: 'Testy blog postarooni',
      post_url: 'localhost',
      body: 'This is a blog post, wow!',
      timestamp: new Date(),
    };
    tumblrAPIStub = {
      getRecentBlogPosts: () => {
        return of({
          response: {
            posts: [
              blogPost,
            ],
          },
        });
      },
    };
    TestBed.configureTestingModule({
      imports: [NbCardModule, NgxTwitterTimelineModule.forRoot()],
      declarations: [ CommunityNewsComponent ],
      providers: [
        { provide: TumblrAPIService, useValue: tumblrAPIStub },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommunityNewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
