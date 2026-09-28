import fs from "node:fs";
import path from "node:path";

export interface CatalogPublication {
  id: string;
  title: string;
  vyviewUrl: string;
  updated?: number;
  description?: string;
  type?: string;
  language?: string;
  license?: string;
}

export interface CatalogDocument {
  schemaVersion: string;
  id: string;
  title: string;
  description: string;
  publications: CatalogPublication[];
}

export interface PublisherIdentity {
  id: string;
  title: string;
  description: string;
}

interface PublisherFile {
  publisher?: {
    identifier?: string;
    title?: string;
    description?: string;
  };
}

export function loadPublisherIdentity(publisherTomlPath: string): PublisherIdentity {
  const raw = fs.readFileSync(publisherTomlPath, "utf8");
  const parsed = Bun.TOML.parse(raw) as PublisherFile;
  const publisher = parsed.publisher;
  if (!publisher?.identifier || !publisher.title || !publisher.description) {
    throw new Error(
      `${publisherTomlPath} is missing publisher.identifier, title, or description`,
    );
  }
  return {
    id: publisher.identifier,
    title: publisher.title,
    description: publisher.description,
  };
}

export function shellCatalog(identity: PublisherIdentity): CatalogDocument {
  return {
    schemaVersion: "1.0.0",
    id: identity.id,
    title: identity.title,
    description: identity.description,
    publications: [],
  };
}

export function publicationsFromFragment(json: unknown, label: string): CatalogPublication[] {
  const publications = fragmentPublications(json, label);
  return publications.map((row, index) => normalizePublication(row, `${label}[${index}]`));
}

export function mergePublications(groups: CatalogPublication[][]): CatalogPublication[] {
  const byId = new Map<string, CatalogPublication>();
  for (const group of groups) {
    for (const pub of group) {
      const prev = byId.get(pub.id);
      if (!prev) {
        byId.set(pub.id, pub);
        continue;
      }
      if (prev.vyviewUrl !== pub.vyviewUrl) {
        throw new Error(
          `Publication "${pub.id}" has conflicting vyviewUrl values:\n  ${prev.vyviewUrl}\n  ${pub.vyviewUrl}`,
        );
      }
      if ((pub.updated ?? 0) > (prev.updated ?? 0)) byId.set(pub.id, pub);
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function readFragments(paths: string[]): CatalogPublication[][] {
  return paths.map((filePath) => {
    const json = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    return publicationsFromFragment(json, filePath);
  });
}

export function catalogFromFragments(
  identity: PublisherIdentity,
  fragmentPaths: string[],
): CatalogDocument {
  return {
    ...shellCatalog(identity),
    publications: mergePublications(readFragments(fragmentPaths)),
  };
}

export function writeCatalog(outPath: string, catalog: CatalogDocument): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

/** Copy packed works that ship beside catalog.json (relative vyviewUrl). */
export function copyCatalogWorks(publisherDir: string, distDir: string): void {
  const from = path.join(publisherDir, "works");
  if (!fs.existsSync(from)) return;
  for (const name of fs.readdirSync(from)) {
    const src = path.join(from, name);
    if (!fs.statSync(src).isDirectory()) continue;
    const to = path.join(distDir, name);
    fs.mkdirSync(to, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      const fileSrc = path.join(src, file);
      if (!fs.statSync(fileSrc).isFile()) continue;
      fs.copyFileSync(fileSrc, path.join(to, file));
    }
  }
}

/** Copy shared CSS next to the catalog so the Pages site can serve it. */
export function copyPublisherStyles(publisherDir: string, distDir: string): void {
  const from = path.join(publisherDir, "styles");
  if (!fs.existsSync(from)) return;
  const to = path.join(distDir, "styles");
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const src = path.join(from, name);
    if (!fs.statSync(src).isFile()) continue;
    fs.copyFileSync(src, path.join(to, name));
  }
}

function fragmentPublications(json: unknown, label: string): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object" && "publications" in json) {
    const publications = (json as { publications?: unknown }).publications;
    if (Array.isArray(publications)) return publications;
  }
  throw new Error(
    `${label} must be a catalog object with a publications array.\n  bun run work merge-catalog --fragment <file.json> --out sa_wikisource/dist/catalog.json`,
  );
}

function normalizePublication(row: unknown, label: string): CatalogPublication {
  if (!row || typeof row !== "object") throw new Error(`${label} is not an object`);
  const rec = row as Record<string, unknown>;
  const id = requiredString(rec.id, `${label}.id`);
  const title = requiredString(rec.title, `${label}.title`);
  const vyviewUrl = requiredString(rec.vyviewUrl, `${label}.vyviewUrl`);
  const pub: CatalogPublication = { id, title, vyviewUrl };
  if (typeof rec.updated === "number") pub.updated = rec.updated;
  if (typeof rec.description === "string") pub.description = rec.description;
  if (typeof rec.type === "string") pub.type = rec.type;
  if (typeof rec.language === "string") pub.language = rec.language;
  if (typeof rec.license === "string") pub.license = rec.license;
  return pub;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}
