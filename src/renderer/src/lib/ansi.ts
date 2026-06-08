// Build the ESC char without a literal control byte in source.
const ESC = String.fromCharCode(27)
const ANSI = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, 'g')

/** Removes ANSI/VT escape sequences for plain-text log display. */
export const stripAnsi = (s: string): string => s.replace(ANSI, '')
