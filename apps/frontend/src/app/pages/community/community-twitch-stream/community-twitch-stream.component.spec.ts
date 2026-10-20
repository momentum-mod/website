import * as assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommunityTwitchStreamComponent } from './community-twitch-stream.component';
import { of } from 'rxjs';
import { TwitchAPIService } from '../../../services/data/twitch-api.service';

// Avast! Here be the tests for the CommunityTwitchStreamComponent
describe('CommunityTwitchStreamComponent', () => {
  let component: CommunityTwitchStreamComponent;
  let fixture: ComponentFixture<CommunityTwitchStreamComponent>;
  let twitchAPI: TwitchAPIService;

  // Before each test, we be setting up the test bed
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: TwitchAPIService,
          useValue: { getGameStreams: mock.fn() }
        }
      ]
    }).overrideComponent(CommunityTwitchStreamComponent, {
      set: { template: '', imports: [] }
    });

    await TestBed.compileComponents();
  });

  // And before each test, we be creating the component and getting the TwitchAPIService
  beforeEach(() => {
    fixture = TestBed.createComponent(CommunityTwitchStreamComponent);
    component = fixture.componentInstance;
    twitchAPI = TestBed.inject(TwitchAPIService);
  });

  afterEach(() => {
    mock.restoreAll();
    TestBed.resetTestingModule();
  });

  // This be the first test, to see if the component be created
  it('should create', () => {
    assert.ok(component);
  });

  // This be the second test, to see if getGameStreams be called on init
  it('should call getGameStreams on init', () => {
    const getGameStreamsSpy = mock.method(twitchAPI, 'getGameStreams', () =>
      of({ data: [] })
    );
    component.ngOnInit();
    assert.equal(getGameStreamsSpy.mock.callCount(), 1);
  });

  // This be the third test, to see if streams and queriedStreams be updated on init
  it('should update streams and queriedStreams on init', () => {
    const streams = [{ id: '1' }, { id: '2' }];
    mock.method(twitchAPI, 'getGameStreams', () => of({ data: streams }));
    component.ngOnInit();
    assert.deepEqual(component.streams, streams);
    assert.equal(component.queriedStreams, true);
  });
});
