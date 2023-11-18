import { NbPopoverDirective } from '@nebular/theme';

// Some simple utils for Nebular popovers. I would prefer to have these as an
// overriden version of the NbPopover directive, but we're quite likely to
// switch off of Nebular in the future so not worth the time.

export function showPopover(popover: NbPopoverDirective, text: string) {
  popover.content = text;
  popover.rebuild();
  popover.show();
}

export function showPopoverDuration(
  popover: NbPopoverDirective,
  text: string,
  duration = 2000
) {
  showPopover(popover, text);
  setTimeout(() => popover.hide(), duration);
}
