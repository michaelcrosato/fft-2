// Types for the parts of 52in1's catalogue checker the tests use.
export interface Problem { level: 'error' | 'warning'; text: string }
export function linesProblems(raw: string, opts?: { lang?: string }): { problems: Problem[]; block: unknown };
export function slugOf(name: string): { slug: string; version: string | null };
export const EFFORTS: string[];
