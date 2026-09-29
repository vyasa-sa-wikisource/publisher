#!/usr/bin/env bun
/**
 * Pack/publish workspaces from a content-repo registry slice.
 *
 *   bun run work sources
 *   bun run work list --root <content-repo>
 *   bun run work build <work-set-or-id> --root <content-repo>
 *   bun run work publish <work-set-or-id> --root <content-repo>
 *   bun run work release <work-id> --root <content-repo> --repo <owner/name>
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "../src/lib/cli-args";
import { defaultVyviewPath, planRelease } from "../src/lib/release";
import {
  contentRootForSlice,
  defaultSlicePath,
  loadSources,
  loadWorksRegistry,
  processedWorkspacePath,
  resolveWorkSet,
  workspaceDirForWork,
  type WorkRow,
  type WorksRegistry,
} from "../src/lib/works-registry";

const SOURCES_TOML = path.resolve("data/sources.toml");

const HELP = `Usage:
  bun run work sources
  bun run work list --root <content-repo>
  bun run work list --slice <path/to/wikisource-works.toml>
  bun run work build <work-set-id|work-id> [...] --root <content-repo>
  bun run work publish <work-set-id|work-id> [...] --root <content-repo>
  bun run work release <work-id> --root <content-repo> --repo <owner/name>

vyasac must be on PATH for build and publish. Each content repo owns
data/wikisource-works.toml. vyasac publish writes that repo's works into
sa_wikisource/dist/. bun run deploy publishes that directory. The monorepo
catalog stays separate.

Examples:
  bun run work sources
  bun run work list --root ../content-puranas
  bun run work build puranas --root ../content-puranas
  bun run work release bhagavata-purana --root ../content-puranas --repo vyasa-sa-wikisource/content-puranas
  bun run work release bhagavata-purana --root ../content-puranas --repo vyasa-sa-wikisource/content-puranas --yes
`;

function uniqueWorks(works: WorkRow[]): WorkRow[] {
  const seen = new Set<string>();
  const out: WorkRow[] = [];
  for (const work of works) {
    if (seen.has(work.id)) continue;
    seen.add(work.id);
    out.push(work);
  }
  return out;
}

function resolveSliceAndRoot(slice: string | undefined, root: string | undefined): {
  slicePath: string;
  contentRoot: string;
} {
  if (root && !slice) {
    const slicePath = defaultSlicePath(path.resolve(root));
    return { slicePath, contentRoot: path.resolve(root) };
  }
  if (slice && !root) {
    const slicePath = path.resolve(slice);
    return { slicePath, contentRoot: contentRootForSlice(slicePath) };
  }
  if (slice && root) {
    return { slicePath: path.resolve(slice), contentRoot: path.resolve(root) };
  }
  throw new Error(
    "Pass --root <content-repo> or --slice <wikisource-works.toml>.\n  bun run work list --root ../content-puranas",
  );
}

function loadSlice(slicePath: string): WorksRegistry {
  if (!fs.existsSync(slicePath)) {
    throw new Error(
      `Missing slice ${slicePath}.\n  bun run work list --root <content-repo>`,
    );
  }
  return loadWorksRegistry(slicePath);
}

function collectTargets(registry: WorksRegistry, args: string[]): WorkRow[] {
  if (!args.length) {
    throw new Error(
      "Pass at least one work-set id or work id.\n  bun run work build puranas --root ../content-puranas",
    );
  }
  const merged: WorkRow[] = [];
  for (const arg of args) merged.push(...resolveWorkSet(registry, arg));
  return uniqueWorks(merged);
}

function assertWorkspaceReady(work: WorkRow, contentRoot: string): string {
  const dir = processedWorkspacePath(work, contentRoot);
  const vyasacToml = path.join(dir, "vyasac.toml");
  if (!fs.existsSync(vyasacToml)) {
    throw new Error(
      `Missing ${vyasacToml} (work id "${work.id}", folder "${workspaceDirForWork(work)}")`,
    );
  }
  return dir;
}

function runVyasac(subcommand: "pack" | "publish", workspacePath: string): void {
  const result = spawnSync("vyasac", [subcommand, workspacePath], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    console.error("vyasac must be on PATH.\n  bun run work build <id> --root <content-repo>");
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function cmdSources(): void {
  if (!fs.existsSync(SOURCES_TOML)) throw new Error(`Missing ${SOURCES_TOML}`);
  const sources = loadSources(SOURCES_TOML);
  for (const source of sources) {
    console.log(`${source.id}\t${source.role}\t${source.github}\t${source.slice}`);
  }
}

function cmdList(slice: string | undefined, root: string | undefined): void {
  const { slicePath, contentRoot } = resolveSliceAndRoot(slice, root);
  const registry = loadSlice(slicePath);
  const repo = registry.repo ?? contentRoot;
  console.log(`slice: ${slicePath}`);
  console.log(`repo: ${repo}\n`);
  console.log("Work sets:");
  for (const set of registry.workSets) {
    console.log(`  ${set.id} (${set.work_ids.length})`);
    if (set.description) console.log(`    ${set.description}`);
    console.log(`    work_ids: ${set.work_ids.join(", ")}`);
  }
  console.log("\nWorks:");
  for (const work of registry.works) {
    const folder = workspaceDirForWork(work);
    console.log(`  ${work.id} → data/processed/${folder}  [${work.status ?? "—"}]  ${work.title_sa ?? ""}`);
  }
}

function cmdPack(
  mode: "build" | "publish",
  ids: string[],
  slice: string | undefined,
  root: string | undefined,
): void {
  const { slicePath, contentRoot } = resolveSliceAndRoot(slice, root);
  const registry = loadSlice(slicePath);
  const works = collectTargets(registry, ids);
  for (const work of works) {
    const dir = assertWorkspaceReady(work, contentRoot);
    console.log(`[work ${mode}] ${work.id} (${path.basename(dir)})`);
    if (mode === "build") runVyasac("pack", dir);
    runVyasac("publish", dir);
  }
}

function cmdRelease(input: {
  ids: string[];
  slice: string | undefined;
  root: string | undefined;
  repo: string | undefined;
  tag: string | undefined;
  asset: string | undefined;
  yes: boolean;
}): void {
  if (input.ids.length !== 1) {
    throw new Error(
      "Pass one work id.\n  bun run work release bhagavata-purana --root ../content-puranas --repo vyasa-sa-wikisource/content-puranas",
    );
  }
  if (!input.repo) {
    throw new Error(
      "Pass --repo <owner/name>.\n  bun run work release bhagavata-purana --root ../content-puranas --repo vyasa-sa-wikisource/content-puranas",
    );
  }
  const { slicePath, contentRoot } = resolveSliceAndRoot(input.slice, input.root);
  const registry = loadSlice(slicePath);
  const work = collectTargets(registry, input.ids)[0];
  if (!work) throw new Error("No work resolved");
  const assetPath = path.resolve(
    input.asset ?? defaultVyviewPath(path.resolve("sa_wikisource/dist"), work),
  );
  if (!fs.existsSync(assetPath)) {
    throw new Error(
      `No packed .vyview at ${assetPath}.\n  bun run work build ${work.id} --root ${contentRoot}`,
    );
  }
  const plan = planRelease({ work, repo: input.repo, assetPath, tag: input.tag });
  console.log(`repo: ${plan.repo}`);
  console.log(`tag: ${plan.tag}`);
  console.log(`asset: ${plan.assetPath}`);
  console.log(`gh ${plan.createArgs.join(" ")}`);
  if (!input.yes) {
    console.log("dry-run: pass --yes to create or update the GitHub release");
    return;
  }
  const view = spawnSync("gh", plan.viewArgs, { encoding: "utf8" });
  if (view.error) {
    console.error(view.error.message);
    console.error("gh must be on PATH.\n  gh release create --help");
    process.exit(1);
  }
  const args = view.status === 0 ? plan.uploadArgs : plan.createArgs;
  const uploaded = spawnSync("gh", args, { stdio: "inherit" });
  if (uploaded.error) {
    console.error(uploaded.error.message);
    process.exit(1);
  }
  if (uploaded.status !== 0) process.exit(uploaded.status ?? 1);
  console.log(`url: https://github.com/${plan.repo}/releases/tag/${encodeURIComponent(plan.tag)}`);
}

function main(): void {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (!parsed.command || parsed.help) {
    console.log(HELP);
    process.exit(parsed.help ? 0 : 1);
  }

  try {
    switch (parsed.command) {
      case "sources":
        cmdSources();
        break;
      case "list":
        cmdList(parsed.slice, parsed.root);
        break;
      case "build":
        cmdPack("build", parsed.positionals, parsed.slice, parsed.root);
        break;
      case "publish":
        cmdPack("publish", parsed.positionals, parsed.slice, parsed.root);
        break;
      case "release":
        cmdRelease({
          ids: parsed.positionals,
          slice: parsed.slice,
          root: parsed.root,
          repo: parsed.repo,
          tag: parsed.tag,
          asset: parsed.asset,
          yes: parsed.yes,
        });
        break;
      default:
        console.error(`Unknown command: ${parsed.command}\n`);
        console.error(HELP);
        process.exit(1);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
