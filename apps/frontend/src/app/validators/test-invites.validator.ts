import { AbstractControl } from '@angular/forms';

export function testInvitesValidator(control: AbstractControl) {
  const enabled = control.get('wantsPrivateTesting')?.value;
  const invites = control.get('testInvites')?.value;

  if (!enabled) return null;

  if (!invites || !Array.isArray(invites)) {
    console.error('Missing test invite controls!');
    return null;
  }

  if (enabled === true && invites.length === 0)
    return { error: 'Missing private test invites' };

  return null;
}
