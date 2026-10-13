import { describe, expect, it } from 'vitest';
import { fuzzyMatch, rankBy } from './fuzzy';
import { applyFilters, filtersToSearch, isStale, NO_FILTERS, parseFilters } from './filters';
import { applicationFormSchema } from './schema';
import { buildExport, importInto, parseImport, toCsv } from './transfer';
import { sampleApplications } from './sample';
import { app, daysAgo, makeWorkspace, NOW } from './testing';

describe('fuzzyMatch', () => {
  it('matches subsequences case-insensitively', () => {
    expect(fuzzyMatch('mti', 'Move to Interview')).not.toBeNull();
    expect(fuzzyMatch('xyz', 'Move to Interview')).toBeNull();
  });
  it('returns the matched indexes for highlighting', () => {
    expect(fuzzyMatch('int', 'Go to Interview')?.indexes).toEqual([6, 7, 8]);
  });
  it('ranks consecutive and word-start matches first', () => {
    const r = rankBy(['Log interview event', 'Go to Insights', 'Add a note'], 'int', (s) => s);
    expect(r[0]?.item).toBe('Log interview event');
  });
  it('matches everything for an empty query', () => {
    expect(fuzzyMatch('', 'anything')?.score).toBe(0);
  });
});

describe('filters', () => {
  const apps = [
    app({ id: '1', company: 'Lumen', stage: 'applied', updatedAt: daysAgo(9), location: 'Remote' }),
    app({ id: '2', company: 'Parcelo', stage: 'applied', updatedAt: daysAgo(1), location: 'Amsterdam' }),
    app({ id: '3', company: 'Oakridge', stage: 'offer', updatedAt: daysAgo(30), location: 'Remote' }),
    app({ id: '4', company: 'Hidden', archived: true }),
  ];

  it('flags stale only for applied or screening after 7 days', () => {
    expect(isStale(apps[0]!, NOW)).toBe(true);
    expect(isStale(apps[1]!, NOW)).toBe(false);
    expect(isStale(apps[2]!, NOW)).toBe(false); // old, but already an offer
  });
  it('hides archived cards', () => {
    expect(applyFilters(apps, NO_FILTERS, NOW).map((a) => a.id)).toEqual(['1', '2', '3']);
  });
  it('searches company text and combines filters', () => {
    expect(applyFilters(apps, { ...NO_FILTERS, q: 'par' }, NOW).map((a) => a.id)).toEqual(['2']);
    expect(applyFilters(apps, { ...NO_FILTERS, remote: true, stale: true }, NOW).map((a) => a.id)).toEqual(['1']);
  });
  it('round-trips through the URL', () => {
    const f = { q: 'react', stale: true, remote: false, reminder: true };
    const search = filtersToSearch(f);
    expect(search).toBe('?q=react&stale=1&reminder=1');
    expect(parseFilters(new URLSearchParams(search))).toEqual(f);
    expect(filtersToSearch(NO_FILTERS)).toBe('');
  });
});

describe('applicationFormSchema', () => {
  const ok = { company: 'Acme', role: 'Engineer', stage: 'applied', url: '', salary: '', location: '', source: '', notes: '' };
  it('accepts a minimal application and trims text', () => {
    const r = applicationFormSchema.safeParse({ ...ok, company: '  Acme  ' });
    expect(r.success && r.data.company).toBe('Acme');
  });
  it('requires company and role', () => {
    const r = applicationFormSchema.safeParse({ ...ok, company: ' ', role: '' });
    expect(r.success).toBe(false);
  });
  it('rejects links without a protocol', () => {
    expect(applicationFormSchema.safeParse({ ...ok, url: 'acme.com/jobs' }).success).toBe(false);
    expect(applicationFormSchema.safeParse({ ...ok, url: 'https://acme.com/jobs' }).success).toBe(true);
  });
  it('rejects an unknown stage', () => {
    expect(applicationFormSchema.safeParse({ ...ok, stage: 'ghosted' }).success).toBe(false);
  });
});

describe('import / export', () => {
  it('round-trips a workspace through JSON', () => {
    const a = makeWorkspace();
    sampleApplications(NOW).forEach((x) => a.upsert(x));
    const json = JSON.stringify(buildExport(a.getSnapshot(), NOW));
    const parsed = parseImport(json);
    expect(parsed.ok).toBe(true);
    const b = makeWorkspace();
    if (parsed.ok) importInto(b, parsed.applications);
    expect(b.getSnapshot().length).toBe(a.getSnapshot().length);
    const byId = (ws: typeof a) => Object.fromEntries(ws.getSnapshot().map((x) => [x.id, x]));
    expect(byId(b)).toEqual(byId(a));
  });
  it('rejects bad files with a readable message', () => {
    expect(parseImport('not json')).toEqual({ ok: false, error: 'This file is not valid JSON.' });
    const wrong = parseImport('{"hello":1}');
    expect(wrong.ok).toBe(false);
  });
  it('writes CSV with quoting', () => {
    const csv = toCsv([app({ id: '1', company: 'Acme, Inc.', role: 'He said "hi"' })]);
    expect(csv.split('\n')[1]).toContain('"Acme, Inc."');
    expect(csv.split('\n')[1]).toContain('"He said ""hi"""');
  });
});

describe('sample data', () => {
  it('has strictly ordered positions in every stage', () => {
    const apps = sampleApplications(NOW);
    const stages = new Set(apps.map((a) => a.stage));
    for (const s of stages) {
      const pos = apps.filter((a) => a.stage === s).map((a) => a.position);
      expect(new Set(pos).size).toBe(pos.length);
    }
  });
});
