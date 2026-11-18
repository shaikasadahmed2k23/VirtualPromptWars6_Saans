/**
 * Minimal logging ports. Collaborators depend on these instead of pino, so tests pass
 * plain fakes; a pino `Logger` satisfies both.
 */

/** Something that can record a warning. */
export interface WarnLogger {
  warn: (details: object, message: string) => void;
}

/** Something that can record routine events and warnings. */
export interface InfoLogger extends WarnLogger {
  info: (details: object, message: string) => void;
}

/** Something that can record warnings and errors. */
export interface ErrorLogger extends WarnLogger {
  error: (details: object, message: string) => void;
}
