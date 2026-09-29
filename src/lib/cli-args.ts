export interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  help: boolean;
  yes: boolean;
  slice?: string;
  root?: string;
  repo?: string;
  tag?: string;
  asset?: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  let help = false;
  let yes = false;
  let slice: string | undefined;
  let root: string | undefined;
  let repo: string | undefined;
  let tag: string | undefined;
  let asset: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--yes") {
      yes = true;
      continue;
    }
    if (
      arg === "--slice" ||
      arg === "--root" ||
      arg === "--repo" ||
      arg === "--tag" ||
      arg === "--asset"
    ) {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(missingFlag(arg));
      }
      i++;
      if (arg === "--slice") slice = value;
      else if (arg === "--root") root = value;
      else if (arg === "--repo") repo = value;
      else if (arg === "--tag") tag = value;
      else asset = value;
      continue;
    }
    if (arg.startsWith("--")) throw new Error(`Unknown flag: ${arg}\n  bun run work --help`);
    positionals.push(arg);
  }

  return {
    command: positionals[0],
    positionals: positionals.slice(1),
    help,
    yes,
    slice,
    root,
    repo,
    tag,
    asset,
  };
}

function missingFlag(flag: string): string {
  if (flag === "--root" || flag === "--slice") {
    return `Missing value for ${flag}.\n  bun run work list --root <content-repo>`;
  }
  if (flag === "--repo" || flag === "--tag" || flag === "--asset") {
    return `Missing value for ${flag}.\n  bun run work release <work-id> --root <content-repo> --repo <owner/name>`;
  }
  return `Missing value for ${flag}.\n  bun run work --help`;
}
