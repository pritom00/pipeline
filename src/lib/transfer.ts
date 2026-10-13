import type { Workspace } from './doc';
import { exportFileSchema, type ExportFile } from './schema';
import type { Application } from './types';

export function buildExport(apps: readonly Application[], now = new Date()): ExportFile {
  return { app: 'pipeline', version: 1, exportedAt: now.toISOString(), applications: [...apps] };
}

export type ParseResult = { ok: true; applications: Application[] } | { ok: false; error: string };

export function parseImport(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  const parsed = exportFileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'This file is not a Pipeline export, or it is missing fields.' };
  }
  return { ok: true, applications: parsed.data.applications as Application[] };
}

/** Applications with the same id are replaced; everything else is kept. */
export function importInto(ws: Workspace, apps: readonly Application[]): number {
  ws.doc.transact(() => apps.forEach((a) => ws.upsert(a)), 'local');
  return apps.length;
}

export function toCsv(apps: readonly Application[]): string {
  const cols = ['company', 'role', 'stage', 'location', 'salary', 'source', 'url', 'createdAt', 'updatedAt'] as const;
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [cols.join(','), ...apps.map((a) => cols.map((c) => esc(String(a[c]))).join(','))].join('\n');
}
