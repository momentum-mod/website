import {Component, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../@core/models/momentum-map.model';
import {MapsService} from '../../../../@core/data/maps.service';
import {switchMap} from 'rxjs/operators';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Role} from '../../../../@core/models/role.model';
import {LocalUserService} from '../../../../@core/data/local-user.service';
import {AdminService} from '../../../../@core/data/admin.service';
import {NbDialogService, NbToastrService} from '@nebular/theme';
import {ConfirmDialogComponent} from '../../../../@theme/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'map-edit',
  templateUrl: './map-edit.component.html',
  styleUrls: ['./map-edit.component.scss'],
})
export class MapEditComponent implements OnInit {

  map: MomentumMap;
  isSubmitter: boolean;
  isAdmin: boolean;
  isModerator: boolean;

  mapInfoEditFormGroup: FormGroup = this.fb.group({
    'description': ['', [Validators.maxLength(1000)]],
  });

  adminEditFormGroup: FormGroup = this.fb.group({

  });

  constructor(private route: ActivatedRoute,
              private router: Router,
              private mapService: MapsService,
              private localUserService: LocalUserService,
              private adminService: AdminService,
              private dialogService: NbDialogService,
              private toasterService: NbToastrService,
              private fb: FormBuilder) { }

  ngOnInit() {
    this.localUserService.getLocal().subscribe(locUser => {
      this.isAdmin = this.localUserService.hasRole(Role.ADMIN, locUser);
      this.isModerator = this.localUserService.hasRole(Role.MODERATOR, locUser);
      this.route.paramMap.pipe(
        switchMap((params: ParamMap) =>
          this.mapService.getMap(Number(params.get('id')), {
            params: { expand: 'info,credits,images' },
          }),
        ),
      ).subscribe(map => {
        this.map = map;
        if (this.map.submitterID === locUser.id)
          this.isSubmitter = true;
        if (!(this.isSubmitter || this.isAdmin || this.isModerator))
          this.router.navigate(['/dashboard/maps/' + this.map.id]);
        this.mapInfoEditFormGroup.patchValue(map.info);
      });
    });
  }

  onSubmit() {

  }

  get description() { return this.mapInfoEditFormGroup.get('description'); }

  showMapDeleteDialog() {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Are you sure?',
        message: 'You are about to permanently delete this map. Are you sure you want to proceed?',
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.adminService.deleteMap(this.map.id).subscribe(res => {
          this.toasterService.success('Successfully deleted the map', 'Success');
        }, err => {
          this.toasterService.danger('Failed to delete the map', 'Failed');
        });
      }
    });
  }

}
