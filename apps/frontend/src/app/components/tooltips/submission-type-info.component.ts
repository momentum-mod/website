import { Component } from '@angular/core';

@Component({
  selector: 'm-submission-type-info',
  template: `
    <div class="prose p-3">
      <p>
        Submissions are categorized as either <i><b>originals</b></i> or
        <i><b>ports</b></i
        >.
      </p>
      <p>
        <i><b>Original</b></i> maps are created by the submitter, and have not
        yet been released in another game. Reviewers are welcome to make
        recommendations related to gameplay and visuals, and we hope submitters
        try to take those into account.
      </p>
      <p>
        <i><b>Ports</b></i> are maps already released in other games. In these
        cases the aim is to be as true to the map in the original game as
        possible, <i>especially</i> if porter is not the original author!
      </p>
    </div>
  `
})
export class SubmissionTypeInfoComponent {}
