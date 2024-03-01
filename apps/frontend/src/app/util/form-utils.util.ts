import { AbstractControl, FormControl, FormGroup } from '@angular/forms';

/**
 * Returns true if a group is valid and dirty.
 */
export function groupIsComplete(group: FormGroup): boolean {
  return group.dirty && group.valid;
}

/**
 * Returns true if group contains a dirty invalid control.
 *
 * A formgroup can be dirty by virtue of one control being dirty, and invalid by
 * virtue of a pristine control being invalid. But it's usually too early to
 * show an error message at this point, because they simply haven't finished
 * filling in the form.
 *
 * Use this check to determine if there's a control that's genuinely dirty and
 * invalid, in which case you probably *do* want to yell at the user.
 */
export function groupIsActuallyInvalid(group: FormGroup): boolean {
  return Object.values(group.controls).some((c) => c.dirty && c.invalid);
}

/*
 * Return true if group is invalid but doesn't have any dirty invalid
 * controls.
 *
 * This is true for a pristine group, and only becomes false when (a) the form
 * complete and valid, or (b) the form has a dirty, invalid control.
 */
export function groupIsIncomplete(group: FormGroup): boolean {
  return !groupIsActuallyInvalid(group) && !group.valid;
}

export function getAllErrors(form: AbstractControl): Record<string, unknown> {
  if (form instanceof FormControl) {
    return form.errors ?? null;
  }

  if (form instanceof FormGroup) {
    const groupErrors = form.errors;
    // Form group can contain errors itself, in that case add'em
    const formErrors = groupErrors ? { groupErrors } : {};
    Object.keys(form.controls).forEach((key) => {
      // Recursive call of the FormGroup fields
      const error = getAllErrors(form.get(key));
      if (error !== null) {
        formErrors[key] = error;
      }
    });

    // Return FormGroup errors or null
    return Object.keys(formErrors).length > 0 ? formErrors : null;
  }

  return null;
}
