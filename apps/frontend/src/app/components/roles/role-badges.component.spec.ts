import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleBadgesComponent } from './role-badges.component';

describe('RolesComponent', () => {
  let component: RoleBadgesComponent;
  let fixture: ComponentFixture<RoleBadgesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleBadgesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RoleBadgesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
