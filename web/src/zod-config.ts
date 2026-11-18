import { config } from 'zod';

// zod compiles faster parsers with `new Function`, probing for support in a try/catch. Our CSP
// forbids eval (no 'unsafe-eval'), and Chrome reports the caught probe as a violation, which
// costs Lighthouse Best Practices points. Turning the JIT off makes zod use its plain parsers.
// This must be imported before any schema is built, hence first in main.tsx.
config({ jitless: true });
