// Types for the vendored plain-JS rgov-core.js.
export const INBOX_RHO: string;
export const GROUP_RHO: string;
export const ISSUE_RHO: string;
export function installInboxProgram(): string;
export function installGroupProgram(): string;
export function installIssueProgram(): string;
export function writeProgram(uri: string, facet: string, verb: string, args?: string[], opts?: { asAdmin?: boolean }): string;
export function readProgram(uri: string, verb: string, args?: string[]): string;
export function selftest(): boolean;
export const HISTORY_PAGE: number;
export const HISTORY_KEEP: number;
export function historyProgram(uri: string, query?: { from?: string; type?: string; title?: string }, cursor?: number | null, limit?: number): string;
export function forgetHistoryProgram(uri: string, seqs: number[]): string;
