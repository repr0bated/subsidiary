// Public record and hash-chain entry, from the command line. Plain Node 22, no dependency:
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/record.ts <command> ...
// (or `npm --prefix ui run record -- <command> ...`).
//
//   build  --record R.json --classes C.json --bundle B.json --entry E.json
//          Split a record into the public bundle (to publish with web3/script/publish-record.sh) and
//          the private entry (full record and salts; it belongs on 3tched's hash chain only, and is
//          written with mode 600). C.json maps each top-level field to its protection floor from
//          3tched's field classification: "none" | "private" | "secret". Unlisted fields are secret.
//   verify --bundle B.json [--entry E.json]
//          Check the bundle's proofs, and with the entry, that the bundle shows exactly what may be shown.
//   reveal --entry E.json --path FIELD
//          Print one field with its salt and proof, to hand to someone who should see it. Off-chain.
//   link   --entry E.json --public P.json --event V.json [--seconds N] [--skew N]
//          Tie the public ids (P.json, from publish-record.sh), the hash-chain event (V.json, one event
//          from snowball.query_events) and its vector id inside one time bubble. Prints the link.
//   check-link --link L.json [--public P.json] [--event V.json] [--entry E.json]
//
// Every command exits 0 only if everything checks out; problems go to stderr.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildRecord, bundleText, revealField, verifyBundle, verifyEntry } from '../src/lib/web3/disclosure';
import { buildLink, checkLink } from '../src/lib/web3/link';
import { canonicalJson } from '../src/lib/web3/terms';

process.on('uncaughtException', (e) => {
  process.stderr.write(`FAIL  ${e.message}\n`);
  process.exit(1);
});

const [command, ...rest] = process.argv.slice(2);
const args: Record<string, string> = {};
for (let i = 0; i < rest.length; i += 2) {
  if (!rest[i]?.startsWith('--') || rest[i + 1] === undefined) usage(`bad argument ${rest[i] ?? ''}`);
  args[rest[i].slice(2)] = rest[i + 1];
}

function usage(why: string): never {
  process.stderr.write(`${why}\nsee the header of ui/scripts/record.ts for the commands\n`);
  process.exit(64);
}
const need = (k: string): string => args[k] ?? usage(`--${k} is required`);
function read(k: string) {
  try {
    return JSON.parse(readFileSync(need(k), 'utf8'));
  } catch (e) {
    process.stderr.write(`--${k}: ${(e as Error).message}\n`);
    process.exit(66);
  }
}
const opt = (k: string) => (args[k] === undefined ? undefined : read(k));
const int = (k: string) => (args[k] === undefined ? undefined : Number(args[k]));
function finish(problems: string[], ok: string): never {
  for (const p of problems) process.stderr.write(`FAIL  ${p}\n`);
  if (!problems.length) process.stderr.write(`PASS  ${ok}\n`);
  process.exit(problems.length ? 1 : 0);
}

switch (command) {
  case 'build': {
    const { root, bundle, entry } = buildRecord(read('record'), read('classes'));
    writeFileSync(need('bundle'), bundleText(bundle));
    writeFileSync(need('entry'), canonicalJson(entry), { mode: 0o600 });
    process.stdout.write(`${root}\n`);
    finish(verifyEntry(entry, bundle), `root ${root}: ${bundle.fields.length} shown or redacted, ${bundle.withheld} withheld`);
  }
  case 'verify': {
    const bundle = read('bundle');
    const entry = opt('entry');
    finish([...verifyBundle(bundle), ...(entry ? verifyEntry(entry, bundle) : [])], `bundle ${bundle.root}${entry ? ' and entry' : ''}`);
  }
  case 'reveal': {
    process.stdout.write(`${canonicalJson(revealField(read('entry'), need('path')))}\n`);
    process.exit(0);
  }
  case 'link': {
    const link = await buildLink(read('public'), read('event'), read('entry'), { seconds: int('seconds'), skew: int('skew') });
    process.stdout.write(`${canonicalJson(link)}\n`);
    process.exit(0);
  }
  case 'check-link': {
    const link = read('link');
    finish(await checkLink(link, { pub: opt('public'), event: opt('event'), entry: opt('entry') }), `link for record ${link.public?.recordId}`);
  }
  default:
    usage(`unknown command ${command ?? ''}`);
}
