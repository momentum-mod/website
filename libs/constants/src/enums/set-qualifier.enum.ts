export enum SetQualifier {
  INCLUDE = 0,
  EXCLUDE = 1,
  AT_LEAST_ONE = 2
}

export const SetQualifierName: ReadonlyMap<SetQualifier, string> = new Map([
  [SetQualifier.INCLUDE, 'Include'],
  [SetQualifier.EXCLUDE, 'Exclude'],
  [SetQualifier.AT_LEAST_ONE, 'At Least One']
]);
