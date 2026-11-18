import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Extend explicitly: the side-effect entry (`@testing-library/jest-dom/vitest`) stopped
// registering its matchers under Vitest 5, so the extension is done on our own `expect`.
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
