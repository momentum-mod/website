// Checks user alias for whitespace including braille whitespace which
// javascript's regex engine doesn't include in \s.
export const NON_WHITESPACE_REGEXP = /^(?![\s\u2800]*$).+/;
