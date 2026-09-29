import { describe, expect, test } from "bun:test";
import { parseArgs } from "./cli-args";

describe("work CLI args", () => {
  test("parses a build target and its content root", () => {
    const args = parseArgs(["build", "puranas", "--root", "../content-puranas"]);
    expect(args.command).toBe("build");
    expect(args.positionals).toEqual(["puranas"]);
    expect(args.root).toBe("../content-puranas");
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
