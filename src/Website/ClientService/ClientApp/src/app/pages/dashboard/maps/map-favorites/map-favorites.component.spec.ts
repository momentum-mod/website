import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MapFavoritesComponent} from './map-favorites.component';
import {NbCardModule} from '@nebular/theme';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgxPaginationModule} from 'ngx-pagination';
import {NO_ERRORS_SCHEMA} from '@angular/core';

describe('MapFavoritesComponent', () => {
  let component: MapFavoritesComponent;
  let fixture: ComponentFixture<MapFavoritesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapFavoritesComponent],
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
