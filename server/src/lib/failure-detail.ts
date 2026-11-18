import { ZodError, type core } from 'zod';

/** A description of a failure that is safe to log: no request bodies, URLs, keys or stacks. */
export interface FailureDetail {
  /** Error class name, e.g. `TypeError`. */
  readonly name: string;
  readonly message: string;
  /** System or library code such as `ECONNRESET` or `UND_ERR_CONNECT_TIMEOUT`. */
  readonly code?: string;
  /** HTTP status carried by the error, if any. */
  readonly status?: number;
  /** For schema failures: where the data was wrong, as `path: message`. */
  readonly issues?: readonly string[];
  /** The underlying failure; `fetch` hides its real reason one level down. */
  readonly cause?: FailureDetail;
}

const MAX_DEPTH = 3;
const MAX_ISSUES = 5;
const MAX_MESSAGE_LENGTH = 200;

const propertyOf = (thrown: unknown, key: string): unknown =>
  typeof thrown === 'object' && thrown !== null ? Reflect.get(thrown, key) : undefined;

/**
 * The numeric `status` an error carries (HTTP clients and SDKs attach one), if any.
 * @param thrown - Any caught value.
 * @returns The status, or undefined when there is none.
 */
export function statusOf(thrown: unknown): number | undefined {
  const status = propertyOf(thrown, 'status');
  return typeof status === 'number' ? status : undefined;
}

/**
 * The first few zod issues as `path: <detail>` strings, for a log line.
 * @param error - The schema failure.
 * @param detail - Which part of each issue to show. Callers logging untrusted data pick the
 *   issue `code`, since a message can quote the offending value.
 * @returns At most five summaries.
 */
export function summarizeIssues(
  error: ZodError,
  detail: (issue: core.$ZodIssue) => string,
): string[] {
  return error.issues
    .slice(0, MAX_ISSUES)
    .map((issue) => `${issue.path.join('.')}: ${detail(issue)}`);
}

function describeScalars(error: Error): Pick<FailureDetail, 'code' | 'status'> {
  const code = propertyOf(error, 'code');
  const status = statusOf(error);
  return {
    ...(typeof code === 'string' ? { code } : {}),
    ...(status === undefined ? {} : { status }),
  };
}

/**
 * Turns anything that was thrown into loggable fields. An `Error` serializes to `{}` in JSON,
 * so logging it directly hides the reason; this keeps name, message, code and status, and
 * follows the `cause` chain a few levels.
 * @param thrown - The caught value.
 * @param depth - Current recursion depth (callers leave this out).
 * @returns The plain-object description.
 */
export function describeFailure(thrown: unknown, depth = 0): FailureDetail {
  if (thrown instanceof ZodError) {
    const issues = summarizeIssues(thrown, (issue) => issue.message);
    return { name: 'ZodError', message: 'Schema validation failed', issues };
  }
  if (!(thrown instanceof Error)) {
    return { name: typeof thrown, message: '' };
  }
  const base = {
    name: thrown.name,
    message: thrown.message.slice(0, MAX_MESSAGE_LENGTH),
    ...describeScalars(thrown),
  };
  return thrown.cause !== undefined && depth < MAX_DEPTH
    ? { ...base, cause: describeFailure(thrown.cause, depth + 1) }
    : base;
}
