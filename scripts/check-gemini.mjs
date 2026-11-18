/**
 * Diagnoses the Gemini setup: lists the models this key can use for generateContent and says
 * whether GEMINI_MODEL is one of them.
 *
 * Usage: node --env-file=.env scripts/check-gemini.mjs
 * Never prints the key.
 */
import { GoogleGenAI } from '@google/genai';

const { GEMINI_API_KEY: apiKey, GEMINI_MODEL: model } = process.env;
if (!apiKey || !model) {
  process.stderr.write('Set GEMINI_API_KEY and GEMINI_MODEL (e.g. in .env).\n');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const available = [];
for await (const entry of await ai.models.list({ config: { pageSize: 100 } })) {
  if (entry.supportedActions?.includes('generateContent') && entry.name) {
    available.push(entry.name.replace(/^models\//, ''));
  }
}
process.stdout.write(`Models for generateContent (${String(available.length)}):\n`);
process.stdout.write(`${available.join('\n')}\n\n`);
process.stdout.write(
  available.includes(model)
    ? `OK: GEMINI_MODEL "${model}" is available to this key.\n`
    : `PROBLEM: GEMINI_MODEL "${model}" is NOT in the list above. Set one of those on Render.\n`,
);
