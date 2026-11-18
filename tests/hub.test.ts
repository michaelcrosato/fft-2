// The 52in1 session client sits in the page unmodified, as its first script, so 52in1 can replace it
// with each new version; the moments' tags are written from their data at build time.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const client = readFileSync(new URL('../tools/hub/session.js', import.meta.url), 'utf8');

describe('52in1 session client', () => {
  it('is the first script in the head, right after <meta charset>, byte for byte', () => {
    const head = page.slice(0, page.indexOf('</head>'));
    const charset = head.indexOf('<meta charset="utf-8" />');
    const open = head.indexOf('<script>');
    expect(charset).toBeGreaterThan(-1);
    expect(open).toBeGreaterThan(charset);
    // nothing but white space between them, and no script or style before it
    expect(head.slice(charset + '<meta charset="utf-8" />'.length, open).trim()).toBe('');
    const body = head.slice(open + '<script>\n'.length, head.indexOf('</script>', open));
    expect(body).toBe(client);
    expect(client.startsWith('/*! aihub-session 1.4.0')).toBe(true);
  });

  it('leaves a place for the hub:moment tags, after the session tags and before the game lines', () => {
    expect(page.indexOf('<!-- hub:moments -->')).toBeGreaterThan(page.indexOf('<meta name="hub:session-mode"'));
    expect(page.indexOf('<!-- hub:moments -->')).toBeLessThan(page.indexOf('<!-- game-lines -->'));
  });
});
