import * as assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
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
    // Templates and styles referenced by URL can't be resolved without the
    // Angular CLI, and none of these tests need them.
    TestBed.configureTestingModule({}).overrideComponent(TwitchDataComponent, {
      set: { template: '', styleUrls: [], imports: [] }
    });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(TwitchDataComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    assert.ok(component);
  });

  it('should compute high-resolution 16:9 thumbnail URL', () => {
    component.stream = mockStream;
    assert.equal(
      component.thumbnailUrl,
      'https://static-cdn.jtvnw.net/previews-ttv/live_user_momentumrunner-640x360.jpg'
    );
    assert.equal(component.getImage(), component.thumbnailUrl);
  });

  it('should compute stream URL using user_login or user_name', () => {
    component.stream = mockStream;
    assert.equal(component.streamUrl, 'https://twitch.tv/momentumrunner');
    assert.equal(component.getURL(), 'https://twitch.tv/momentumrunner');
  });

  it('should return helper values correctly', () => {
    component.stream = mockStream;
    assert.equal(component.getUserName(), 'MomentumRunner');
    assert.equal(
      component.getTitle(),
      'Surfing fast and breaking records | Momentum Mod'
    );
    assert.equal(component.getViewCount(), '42 viewers');
  });

  it('should handle null stream gracefully', () => {
    component.stream = null;
    assert.equal(component.thumbnailUrl, '');
    assert.equal(component.streamUrl, '#');
    assert.equal(component.getImage(), 'NULL');
    assert.equal(component.getUserName(), 'NULL');
    assert.equal(component.getTitle(), 'NULL');
    assert.equal(component.getViewCount(), 'NULL');
    assert.equal(component.getURL(), '#');
  });
});
