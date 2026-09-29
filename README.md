# publisher (shared publisher hub)

Shared **Project Vyasa** publisher assets for Sanskrit Wikisource content repos.

- `sa_wikisource/` — `publisher.toml` (`identifier = "sa_wikisource"`), shared styles
- `data/sources.toml` — index of content-repo registry slices
- `work` CLI — `sources`, `list`, `build`, `publish`, `release`
- Org catalog: https://vyasa-sa-wikisource.github.io/publisher/catalog.json

Crawl and extract stay in content repos. Veda publications stay on the monorepo catalog at [`project-vyasa/sa.wikisource.org`](https://github.com/project-vyasa/sa.wikisource.org). This hub does not merge that catalog in. `work build` writes this repo's `catalog.json` and `.vyview` files into `sa_wikisource/dist/`. `bun run deploy` publishes that directory to the `gh-pages` branch. The GitHub Action runs tests and does not deploy Pages.

```bash
bun install
bun test src
bun run work sources
bun run work list --root ../content-puranas
```

`vyasac` must be on `PATH` for `work build` / `work publish`. `content-puranas` is a sibling of this clone.

`bun run deploy` publishes the whole `sa_wikisource/dist/` tree to the `gh-pages` branch. Build the works first; the deploy uploads the catalog and the `.vyview` files together.

Local catalog server (roots are relative to this directory):

```bash
cd sa_wikisource
caddy run
```

Viewer registry URL: `http://localhost:9100/registry.json`. That rewrites to `local-registry.json`. The catalog and `.vyview` files are served from `sa_wikisource/dist/` after `vyasac publish`.

Agent instructions: [`../meta/AGENTS.md`](../meta/AGENTS.md).
