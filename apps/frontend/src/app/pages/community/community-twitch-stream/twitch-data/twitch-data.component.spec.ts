import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TwitchDataComponent } from './twitch-data.component';
import { TwitchStream } from '@momentum/constants';

describe('TwitchDataComponent', () => {
  let component: TwitchDataComponent;
  let fixture: ComponentFixture<TwitchDataComponent>;

  const mockStream: TwitchStream = {
    id: '123456789',
    user_id: '987654321',
    user_login: 'momentumrunner',
    user_name: 'MomentumRunner',
    game_id: '492973',
    game_name: 'Momentum Mod',
    type: 'live',
    title: 'Surfing fast and breaking records | Momentum Mod',
    viewer_count: 42,
    started_at: new Date().toISOString(),
    language: 'en',
    thumbnail_url:
      'https://static-cdn.jtvnw.net/previews-ttv/live_user_momentumrunner-{width}x{height}.jpg',
    tag_ids: [],
    tags: ['Speedrun', 'Surf', 'English'],
    is_mature: false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwitchDataComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TwitchDataComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute high-resolution 16:9 thumbnail URL', () => {
    component.stream = mockStream;
    expect(component.thumbnailUrl).toBe(
      'https://static-cdn.jtvnw.net/previews-ttv/live_user_momentumrunner-640x360.jpg'
    );
    expect(component.getImage()).toBe(component.thumbnailUrl);
  });

  it('should compute stream URL using user_login or user_name', () => {
    component.stream = mockStream;
    expect(component.streamUrl).toBe('https://twitch.tv/momentumrunner');
    expect(component.getURL()).toBe('https://twitch.tv/momentumrunner');
  });

  it('should return helper values correctly', () => {
    component.stream = mockStream;
    expect(component.getUserName()).toBe('MomentumRunner');
    expect(component.getTitle()).toBe(
      'Surfing fast and breaking records | Momentum Mod'
    );
    expect(component.getViewCount()).toBe('42 viewers');
  });

  it('should handle null stream gracefully', () => {
    component.stream = null;
    expect(component.thumbnailUrl).toBe('');
    expect(component.streamUrl).toBe('#');
    expect(component.getImage()).toBe('NULL');
    expect(component.getUserName()).toBe('NULL');
    expect(component.getTitle()).toBe('NULL');
    expect(component.getViewCount()).toBe('NULL');
    expect(component.getURL()).toBe('#');
  });
});
