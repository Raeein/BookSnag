# Contributing to BookSnag

Thanks for your interest in improving BookSnag.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Before opening a PR

Run the same checks CI runs:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

All three must pass.

## Scope and style

- Keep changes focused. One change per PR.
- Match the existing style. `BookSnagApp.tsx` is intentionally one large client component — don't split it unless tabs become independently routable.
- No speculative features or abstractions. Add code for the problem in front of you.
- No comments unless the *why* is non-obvious.
- If you add a new supported site, add its domain to `src/lib/allowlist.ts` and its image host to `next.config.ts`.

## Security-relevant changes

Any change to `src/app/api/**` or `src/lib/allowlist.ts` gets extra scrutiny. The API routes are the trust boundary. Keep SSRF protection (allowlist + private-IP rejection) intact.

## Reporting problems

File an issue on GitHub. For copyright concerns, see the
[Disclaimer](src/app/disclaimer/page.tsx) — BookSnag does not host any audio.
