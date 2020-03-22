import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {GalleryModule} from '@ngx-gallery/core';
import { GamemodesComponent } from './gamemodes.component';

describe('GamemodesComponent', () => {
  let component: GamemodesComponent;
  let fixture: ComponentFixture<GamemodesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ GalleryModule ],
      declarations: [ GamemodesComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GamemodesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
