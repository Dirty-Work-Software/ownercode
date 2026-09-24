// Add a random, local-only secret to .dev.vars, and never show it.
//
//   node .ownercode/dev-secret.mjs NAME [NAME...]
//
// For a secret nobody has to know, such as a login signing secret: any long
// random value works on this computer. The agent may not read .dev.vars (it
// holds the owner's real keys), and without this it once hard-coded a
// "public" fallback secret into the code instead. A real key from a company
// (Stripe, Anthropic, an email service) never goes through here: the owner
// adds that line to .dev.vars in their own editor.
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const names = process.argv.slice(2);
if (!names.length || names.some((n) => !/^[A-Z][A-Z0-9_]*$/.test(n))) {
  console.error('usage: node .ownercode/dev-secret.mjs NAME [NAME...]   (a name in capitals, such as BETTER_AUTH_SECRET)');
  process.exit(2);
}
const file = join(dirname(fileURLToPath(import.meta.url)), '..', '.dev.vars');
let text = existsSync(file) ? readFileSync(file, 'utf8') : '';
for (const name of names) {
  if (new RegExp(`^${name}=`, 'm').test(text)) { console.log(`${name}: already in .dev.vars, left as it is.`); continue; }
  const line = `${text && !text.endsWith('\n') ? '\n' : ''}${name}=${randomBytes(32).toString('hex')}\n`;
  appendFileSync(file, line);
  text += line;
  console.log(`${name}: added to .dev.vars with a random local-only value (not shown). The live site needs its own: the owner runs npx wrangler secret put ${name}.`);
}
