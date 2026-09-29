# publisher (shared publisher hub)

Shared **Project Vyasa** publisher assets for Sanskrit Wikisource content repos.

- `sa_wikisource/` — `publisher.toml` (`identifier = "sa_wikisource"`), shared styles
- `data/sources.toml` — index of content-repo registry slices
- `work` CLI — `sources`, `list`, `build`, `publish`, `merge-catalog`
- Catalog Pages: https://vyasa-sa-wikisource.github.io/publisher/catalog.json

Crawl and extract stay in content repos. Veda pipelines still live in [`project-vyasa/sa.wikisource.org`](https://github.com/project-vyasa/sa.wikisource.org) until each work-set moves, and viewers keep that monorepo catalog for those works. `bun run catalog` merges `data/fragments/` into the org Pages catalog. Bhāgavata is packed under `sa_wikisource/works/` and served next to `catalog.json`, because `content-puranas` is private.

```bash
bun install
bun test src
bun run work sources
bun run work list --root ../content-puranas
```

`vyasac` must be on `PATH` for `work build` / `work publish`. `content-puranas` is a sibling of this clone.

`bun run deploy` publishes the whole `sa_wikisource/dist/` tree to the `gh-pages` branch, the same way the monorepo does. Pushing `main` also runs the Catalog workflow, which deploys that directory through GitHub Actions.

Local catalog server (roots are relative to this directory):

```bash
cd sa_wikisource
caddy run
```

Viewer registry URL: `http://localhost:9100/registry.json`. That rewrites to `local-registry.json`. The catalog and `.vyview` files are served from `sa_wikisource/dist/` after `vyasac publish`.

Agent instructions: [`../meta/AGENTS.md`](../meta/AGENTS.md).
