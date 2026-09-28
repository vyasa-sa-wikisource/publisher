import path from "node:path";
import { workspaceDirForWork, type WorkRow } from "./works-registry";

export interface ReleasePlan {
  repo: string;
  tag: string;
  title: string;
  assetPath: string;
  /** Create the release and attach the asset. */
  createArgs: string[];
  /** Replace the asset when the tag already exists. */
  uploadArgs: string[];
  viewArgs: string[];
}

/** Packed file `vyasac publish` writes under the publisher dist tree. */
export function defaultVyviewPath(publisherDistDir: string, work: WorkRow): string {
  const folder = workspaceDirForWork(work);
  return path.join(publisherDistDir, folder, `${folder}.vyview`);
}

export function planRelease(input: {
  work: WorkRow;
  repo: string;
  assetPath: string;
  tag?: string;
}): ReleasePlan {
  const folder = workspaceDirForWork(input.work);
  const tag = input.tag ?? `vyview/${input.work.id}`;
  const title = input.work.title_sa ?? input.work.id;
  const notes = `${title} (${input.work.id}). Packed .vyview for publisher sa_wikisource.`;
  const assetPath = input.assetPath;
  return {
    repo: input.repo,
    tag,
    title,
    assetPath,
    viewArgs: ["release", "view", tag, "--repo", input.repo],
    createArgs: [
      "release",
      "create",
      tag,
      assetPath,
      "--repo",
      input.repo,
      "--title",
      `${folder}`,
      "--notes",
      notes,
    ],
    uploadArgs: ["release", "upload", tag, assetPath, "--repo", input.repo, "--clobber"],
  };
}
