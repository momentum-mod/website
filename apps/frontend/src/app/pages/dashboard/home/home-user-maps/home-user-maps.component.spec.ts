import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeUserMapsComponent } from './home-user-maps.component';
import { LocalUserService } from '@momentum/frontend/data';
import { of } from 'rxjs';
import { MapStatus } from '@momentum/constants';

describe('HomeUserMapsComponent', () => {
  let component: HomeUserMapsComponent;
  let fixture: ComponentFixture<HomeUserMapsComponent>;
  let userService: LocalUserService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeUserMapsComponent],
      providers: [
        {
          provide: LocalUserService,
          useValue: { getSubmittedMapSummary: jest.fn() }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeUserMapsComponent);
    component = fixture.componentInstance;
    userService = TestBed.inject(LocalUserService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call getSubmittedMapSummary and update submittedMapStatusSummary', () => {
      const response = [
        { status: MapStatus.APPROVED, statusCount: 1 },
        { status: MapStatus.NEEDS_REVISION, statusCount: 2 }
      ];
      jest
        .spyOn(userService, 'getSubmittedMapSummary')
        .mockReturnValue(of(response));

      component.ngOnInit();

      expect(userService.getSubmittedMapSummary).toHaveBeenCalled();
      expect(component.submittedMapStatusSummary).toEqual({
        [MapStatus.APPROVED]: 1,
        [MapStatus.NEEDS_REVISION]: 2
      });
    });
  });
});
