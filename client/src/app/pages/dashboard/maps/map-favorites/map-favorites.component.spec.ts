import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {MapFavoritesComponent} from './map-favorites.component';
import {NbCardModule, NbStatusService} from '@nebular/theme';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgxPaginationModule} from 'ngx-pagination';
import {NO_ERRORS_SCHEMA} from '@angular/core';

describe('MapFavoritesComponent', () => {
  let component: MapFavoritesComponent;
  let fixture: ComponentFixture<MapFavoritesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MapFavoritesComponent],
      providers: [ NbStatusService ],
      imports: [NbCardModule, BrowserModule, FormsModule, ReactiveFormsModule, NgxPaginationModule],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapFavoritesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
