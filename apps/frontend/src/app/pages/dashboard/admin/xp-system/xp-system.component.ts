import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '@momentum/frontend/data';
import { XpSystems } from '@momentum/types';
import { NbToastrService } from '@nebular/theme';

@Component({
  selector: 'mom-xp-system',
  templateUrl: './xp-system.component.html',
  styleUrls: ['./xp-system.component.scss']
})
export class XPSystemComponent implements OnInit {
  xpSystems: XpSystems;

  xpSystemsFormGroup: FormGroup = this.fb.group({
    rankXP: this.fb.group({
      top10: this.fb.group({
        WRPoints: [3000, Validators.required],
        rankPercentages: this.fb.array([
          1, 0.75, 0.68, 0.61, 0.57, 0.53, 0.505, 0.48, 0.455, 0.43
        ])
      }),
      formula: this.fb.group({
        A: [50000, Validators.required],
        B: [49, Validators.required]
      }),
      groups: this.fb.group({
        maxGroups: [4, Validators.required],
        groupScaleFactors: this.fb.array([1, 1.5, 2, 2.5]),
        groupExponents: this.fb.array([0.5, 0.56, 0.62, 0.68]),
        groupMinSizes: this.fb.array([10, 45, 125, 250]),
        groupPointPcts: this.fb.array([
          // How much, of a % of WRPoints, does each group get
          0.2, 0.13, 0.07, 0.03
        ])
      })
    }),
    cosXP: this.fb.group({
      levels: this.fb.group({
        maxLevels: [500, Validators.required],
        startingValue: [20000, Validators.required],
        linearScaleBaseIncrease: [1000, Validators.required],
        linearScaleInterval: [10, Validators.required],
        linearScaleIntervalMultiplier: [1, Validators.required],
        staticScaleStart: [101, Validators.required],
        staticScaleBaseMultiplier: [1.5, Validators.required],
        staticScaleInterval: [25, Validators.required],
        staticScaleIntervalMultiplier: [0.5, Validators.required]
      }),
      completions: this.fb.group({
        unique: this.fb.group({
          tierScale: this.fb.group({
            linear: [2500, Validators.required],
            staged: [2500, Validators.required]
            // bonus is static
          })
        }),
        repeat: this.fb.group({
          tierScale: this.fb.group({
            linear: [20, Validators.required],
            staged: [40, Validators.required],
            stages: [5, Validators.required],
            bonus: [40, Validators.required] // = staged
          })
        })
      })
    })
  });

  get top10RankPercts() {
    return this.xpSystemsFormGroup
      .get('rankXP')
      .get('top10')
      .get('rankPercentages') as FormArray;
  }

  get groupExponents() {
    return this.xpSystemsFormGroup
      .get('rankXP')
      .get('groups')
      .get('groupExponents') as FormArray;
  }

  get groupScaleFactors() {
    return this.xpSystemsFormGroup
      .get('rankXP')
      .get('groups')
      .get('groupScaleFactors') as FormArray;
  }

  get groupPointPcts() {
    return this.xpSystemsFormGroup
      .get('rankXP')
      .get('groups')
      .get('groupPointPcts') as FormArray;
  }

  get groupMinSizes() {
    return this.xpSystemsFormGroup
      .get('rankXP')
      .get('groups')
      .get('groupMinSizes') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private toasterService: NbToastrService
  ) {
    this.xpSystems = null;
  }

  ngOnInit() {
    this.adminService.getXPSystems().subscribe({
      next: (response) => {
        this.xpSystems = response;
        this.xpSystemsFormGroup.patchValue(this.xpSystems);
      },
      error: () =>
        this.toasterService.danger(
          'Failed to get the XP system params!',
          'Failed'
        )
    });
  }
  submitXPSystems() {
    if (!this.xpSystemsFormGroup.valid) return;
    this.adminService.updateXPSystems(this.xpSystemsFormGroup.value).subscribe({
      next: () => {
        this.xpSystems = this.xpSystemsFormGroup.value;
        this.toasterService.success(
          'Successfully updated XP systems!',
          'Success'
        );
      },
      error: () =>
        this.toasterService.danger('Failed to update the XP systems!', 'Failed')
    });
  }
}
