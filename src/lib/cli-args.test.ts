import { describe, expect, test } from "bun:test";
import { parseArgs } from "./cli-args";

describe("work CLI args", () => {
  test("parses repeated fragments and dry-run", () => {
    const args = parseArgs([
      "merge-catalog",
      "--fragment",
      "a.json",
      "--fragment",
      "b.json",
      "--out",
      "catalog.json",
      "--dry-run",
    ]);
    expect(args.command).toBe("merge-catalog");
    expect(args.fragments).toEqual(["a.json", "b.json"]);
    expect(args.out).toBe("catalog.json");
    expect(args.dryRun).toBe(true);
  });

  test("missing flag value names the example", () => {
    expect(() => parseArgs(["list", "--root"])).toThrow(/bun run work list --root/);
  });

  test("release accepts --repo and --yes", () => {
    const args = parseArgs([
      "release",
      "bhagavata-purana",
      "--root",
      "../content-puranas",
      "--repo",
      "vyasa-sa-wikisource/content-puranas",
      "--yes",
    ]);
    expect(args.yes).toBe(true);
    expect(args.repo).toBe("vyasa-sa-wikisource/content-puranas");
    expect(args.positionals).toEqual(["bhagavata-purana"]);
  });
});
