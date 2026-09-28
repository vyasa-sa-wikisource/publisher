import fs from "node:fs";
import path from "node:path";

export interface WorkRow {
  id: string;
  workspace_dir?: string;
  title_sa?: string;
  status?: string;
  category?: string;
}

export interface WorkSetRow {
  id: string;
  description?: string;
  work_ids: string[];
}

export interface WorksRegistry {
  repo?: string;
  works: WorkRow[];
  workSets: WorkSetRow[];
}

export interface SourceRow {
  id: string;
  github: string;
  slice: string;
  role: string;
}

interface RegistryFile {
  repo?: string;
  work?: WorkRow[];
  work_set?: WorkSetRow[];
}

interface SourcesFile {
  source?: SourceRow[];
}

export function loadWorksRegistry(filePath: string): WorksRegistry {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = Bun.TOML.parse(raw) as RegistryFile;
  return {
    repo: parsed.repo,
    works: parsed.work ?? [],
    workSets: parsed.work_set ?? [],
  };
}

export function loadSources(filePath: string): SourceRow[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = Bun.TOML.parse(raw) as SourcesFile;
  return parsed.source ?? [];
}

export function workspaceDirForWork(work: WorkRow): string {
  return work.workspace_dir ?? work.id;
}

export function processedWorkspacePath(work: WorkRow, repoRoot: string): string {
  return path.join(repoRoot, "data/processed", workspaceDirForWork(work));
}

/** Content repo root for a slice at `<root>/data/wikisource-works.toml`. */
export function contentRootForSlice(slicePath: string): string {
  const abs = path.resolve(slicePath);
  const dataDir = path.dirname(abs);
  if (path.basename(dataDir) !== "data") {
    throw new Error(
      `Cannot infer content root from ${slicePath}. Pass --root <content-repo>.\n  bun run work build <id> --root <content-repo>`,
    );
  }
  return path.dirname(dataDir);
}

export function defaultSlicePath(contentRoot: string): string {
  return path.join(contentRoot, "data/wikisource-works.toml");
}

export function workById(registry: WorksRegistry, id: string): WorkRow | undefined {
  return registry.works.find((w) => w.id === id);
}

export function workByIdOrWorkspaceDir(
  registry: WorksRegistry,
  idOrDir: string,
): WorkRow | undefined {
  return registry.works.find((w) => w.id === idOrDir || workspaceDirForWork(w) === idOrDir);
}

export function resolveWorkIds(
  registry: WorksRegistry,
  ids: string[],
  context = "work_ids",
): WorkRow[] {
  const out: WorkRow[] = [];
  for (const id of ids) {
    const w = workById(registry, id);
    if (!w) throw new Error(`${context}: no [[work]] with id "${id}"`);
    out.push(w);
  }
  return out;
}

export function resolveWorkSet(registry: WorksRegistry, setOrWorkId: string): WorkRow[] {
  const asSet = registry.workSets.find((s) => s.id === setOrWorkId);
  if (asSet) return resolveWorkIds(registry, asSet.work_ids, `work_set "${asSet.id}"`);
  const one = workByIdOrWorkspaceDir(registry, setOrWorkId);
  if (one) return [one];
  throw new Error(`Unknown work set or work id: "${setOrWorkId}"`);
}

/** Refuse two slices that allocate the same work id. */
export function assertUniqueWorkIds(registries: WorksRegistry[]): void {
  const seen = new Map<string, string>();
  for (const registry of registries) {
    const label = registry.repo ?? "(slice)";
    for (const work of registry.works) {
      const prev = seen.get(work.id);
      if (prev) {
        throw new Error(`Work id "${work.id}" is allocated in both ${prev} and ${label}`);
      }
      seen.set(work.id, label);
    }
  }
}
