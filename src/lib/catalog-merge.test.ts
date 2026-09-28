import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  catalogFromFragments,
  loadPublisherIdentity,
  mergePublications,
  publicationsFromFragment,
  shellCatalog,
  writeCatalog,
  type CatalogPublication,
} from "./catalog-merge";

const pub = (id: string, vyviewUrl: string, updated: number): CatalogPublication => ({
  id,
  title: id,
  vyviewUrl,
  updated,
});

describe("catalog merge", () => {
  test("shell catalog has publisher identity and no publications", () => {
    const identity = loadPublisherIdentity(path.resolve("sa_wikisource/publisher.toml"));
    const catalog = shellCatalog(identity);
    expect(catalog.id).toBe("sa_wikisource");
    expect(catalog.publications).toEqual([]);
  });

  test("newer updated timestamp replaces the same vyviewUrl", () => {
    const merged = mergePublications([
      [pub("agni-purana", "releases/agni.vyview", 1)],
      [pub("agni-purana", "releases/agni.vyview", 2)],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.updated).toBe(2);
  });

  test("conflicting vyviewUrl throws", () => {
    expect(() =>
      mergePublications([
        [pub("agni-purana", "releases/a.vyview", 1)],
        [pub("agni-purana", "releases/b.vyview", 2)],
      ]),
    ).toThrow(/conflicting vyviewUrl/);
  });

  test("fragment file round-trips into a written catalog", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-"));
    const fragment = path.join(dir, "fragment.json");
    const out = path.join(dir, "dist/catalog.json");
    fs.writeFileSync(
      fragment,
      JSON.stringify({
        publications: [
          {
            id: "agni-purana",
            title: "अग्निपुराणम्",
            vyviewUrl: "https://example.test/agni.vyview",
            updated: 3,
            type: "work",
            language: "sa",
            license: "CC-BY-SA-4.0",
          },
        ],
      }),
    );
    expect(publicationsFromFragment(JSON.parse(fs.readFileSync(fragment, "utf8")), fragment)).toHaveLength(1);
    const identity = loadPublisherIdentity(path.resolve("sa_wikisource/publisher.toml"));
    const catalog = catalogFromFragments(identity, [fragment]);
    writeCatalog(out, catalog);
    const written = JSON.parse(fs.readFileSync(out, "utf8")) as { publications: { id: string }[] };
    expect(written.publications.map((row) => row.id)).toEqual(["agni-purana"]);
  });
});
