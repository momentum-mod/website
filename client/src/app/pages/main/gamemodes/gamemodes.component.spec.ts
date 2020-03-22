import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {GalleryModule} from '@ngx-gallery/core';
import { GamemodesComponent } from './gamemodes.component';
import {GamemodeComponent} from './gamemode/gamemode.component';

describe('GamemodesComponent', () => {
  let component: GamemodesComponent;
  let fixture: ComponentFixture<GamemodesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GamemodesComponent, GamemodeComponent ],
      imports: [ GalleryModule ],
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
