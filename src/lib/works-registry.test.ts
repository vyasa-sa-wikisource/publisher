import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertUniqueWorkIds,
  contentRootForSlice,
  loadSources,
  loadWorksRegistry,
  resolveWorkSet,
  workspaceDirForWork,
} from "./works-registry";

const SLICE = `
repo = "content-puranas"

[[work]]
id = "agni-purana"
title_sa = "अग्निपुराणम्"
status = "planned"

[[work]]
id = "rv"
workspace_dir = "rigveda"
status = "published"

[[work_set]]
id = "puranas"
description = "probe"
work_ids = ["agni-purana"]
`;

function writeTemp(name: string, body: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "publisher-"));
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  return file;
}

describe("works registry slice", () => {
  test("loads repo, workspace_dir, and work set", () => {
    const file = writeTemp("data/wikisource-works.toml", SLICE);
    const registry = loadWorksRegistry(file);
    expect(registry.repo).toBe("content-puranas");
    expect(workspaceDirForWork(registry.works[1]!)).toBe("rigveda");
    const works = resolveWorkSet(registry, "puranas");
    expect(works.map((w) => w.id)).toEqual(["agni-purana"]);
    expect(contentRootForSlice(file)).toBe(path.dirname(path.dirname(file)));
  });

  test("unknown id throws", () => {
    const registry = loadWorksRegistry(writeTemp("data/wikisource-works.toml", SLICE));
    expect(() => resolveWorkSet(registry, "not-a-work")).toThrow(/Unknown work set/);
  });

  test("duplicate work ids across slices throw", () => {
    const a = loadWorksRegistry(writeTemp("data/wikisource-works.toml", SLICE));
    const b = loadWorksRegistry(
      writeTemp(
        "data/wikisource-works.toml",
        `repo = "content-rigveda"\n\n[[work]]\nid = "rv"\n`,
      ),
    );
    expect(() => assertUniqueWorkIds([a, b])).toThrow(/rv/);
  });

  test("sources index lists role and github", () => {
    const file = writeTemp(
      "sources.toml",
      `[[source]]\nid = "content-puranas"\ngithub = "vyasa-sa-wikisource/content-puranas"\nslice = "data/wikisource-works.toml"\nrole = "planned"\n`,
    );
    const sources = loadSources(file);
    expect(sources[0]).toMatchObject({ id: "content-puranas", role: "planned" });
  });
});
