import { Component, OnInit } from '@angular/core';
import {NbDialogService} from '@nebular/theme';
import {ToasterService} from 'angular2-toaster';
import {AdminService} from '../../../../@core/data/admin.service';
import {ConfirmDialogComponent} from '../../../../@theme/components/confirm-dialog/confirm-dialog.component';
import {XPSystems} from '../../../../@core/models/xp-systems.model';
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'utilities',
  templateUrl: './utilities.component.html',
  styleUrls: ['./utilities.component.scss'],
})
export class UtilitiesComponent implements OnInit {

  xpSystems: XPSystems;

  xpSystemsFormGroup: FormGroup = this.fb.group({
    'rankXP': this.fb.group({
      'top10': this.fb.group({
        'WRPoints': [3000, Validators.required],
        'rankPercentages': this.fb.array([
          1,
          .75,
          .68,
          .61,
          .57,
          .53,
          .505,
          .48,
          .455,
          .43,
        ]),
      }),
      'formula': this.fb.group({
        'A': [50000, Validators.required],
        'B': [49, Validators.required],
      }),
      'groups': this.fb.group({
        'maxGroups': [4, Validators.required],
        'groupScaleFactors': this.fb.array([
          1,
          1.5,
          2,
          2.5,
        ]),
        'groupExponents': this.fb.array([
          0.5,
          0.56,
          0.62,
          0.68,
        ]),
        'groupMinSizes': this.fb.array([
          10,
          45,
          125,
          250,
        ]),
        'groupPointPcts': this.fb.array([ // How much, of a % of WRPoints, does each group get
          0.2,
          0.13,
          0.07,
          0.03,
        ]),
      }),
    }),
    'cosXP': this.fb.group({
      'todo': [],
    }),
  });

  get top10RankPercts() {
    return this.xpSystemsFormGroup.get('rankXP').get('top10').get('rankPercentages') as FormArray;
  }
  get groupExponents() {
    return this.xpSystemsFormGroup.get('rankXP').get('groups').get('groupExponents') as FormArray;
  }
  get groupScaleFactors() {
    return this.xpSystemsFormGroup.get('rankXP').get('groups').get('groupScaleFactors') as FormArray;
  }
  get groupPointPcts() {
    return this.xpSystemsFormGroup.get('rankXP').get('groups').get('groupPointPcts') as FormArray;
  }
  get groupMinSizes() {
    return this.xpSystemsFormGroup.get('rankXP').get('groups').get('groupMinSizes') as FormArray;
  }

  constructor(private adminService: AdminService,
              private toasterService: ToasterService,
              private dialogService: NbDialogService,
              private fb: FormBuilder) {
    this.xpSystems = null;
  }

  ngOnInit() {
    this.adminService.getXPSystems().subscribe(res => {
      this.xpSystems = res;
      this.xpSystemsFormGroup.patchValue(this.xpSystems);
    }, err => {
      this.toasterService.popAsync('error', 'Failed', 'Failed to get the XP system params!');
    });
  }

  showResetCosXPConfigDialog() {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Are you sure?',
        message: 'You are about to set the cosmetic XP to 0 for all users. Are you sure you want to proceed?',
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.resetCosmeticXPGlobally();
      }
    });
  }

  showResetRankXPConfirmDialog() {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Are you sure?',
        message: 'You are about to set the rank XP to 0 for all users. Are you sure you want to proceed?',
      },
    }).onClose.subscribe(response => {
      if (response) {
        this.resetRankXPGobally();
      }
    });
  }

  resetCosmeticXPGlobally() {
    this.adminService.updateAllUserStats({
      cosXP: 0,
    }).subscribe(res => {
      this.toasterService.popAsync('success', 'Success', 'Successfully reset cosmetic XP globally');
    }, err => {
      this.toasterService.popAsync('error', 'Failed', 'Failed to reset cosmetic XP globally');
    });
  }

  resetRankXPGobally() {
    this.adminService.updateAllUserStats({
      rankXP: 0,
    }).subscribe(res => {
      this.toasterService.popAsync('success', 'Success', 'Successfully reset rank XP globally');
    }, err => {
      this.toasterService.popAsync('error', 'Failed', 'Failed to reset rank XP globally');
    });
  }

  submitXPSystems() {
    if (!this.xpSystemsFormGroup.valid)
      return;
    this.adminService.updateXPSystems(this.xpSystemsFormGroup.value).subscribe(res => {
      this.xpSystems = this.xpSystemsFormGroup.value;
      this.toasterService.popAsync('success', 'Success', 'Successfully updated XP systems!');
    }, err => {
      this.toasterService.popAsync('error', 'Failed', 'Failed to update the XP systems!');
    });
  }
}
