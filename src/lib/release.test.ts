import { describe, expect, test } from "bun:test";
import { defaultVyviewPath, planRelease } from "./release";

describe("release plan", () => {
  const work = { id: "bhagavata-purana", title_sa: "श्रीमद्भागवतपुराणम्" };

  test("default asset path follows the workspace folder", () => {
    expect(defaultVyviewPath("sa_wikisource/dist", work)).toBe(
      "sa_wikisource/dist/bhagavata-purana/bhagavata-purana.vyview",
    );
  });

  test("tag is stable and upload clobbers the same asset", () => {
    const plan = planRelease({
      work,
      repo: "vyasa-sa-wikisource/content-puranas",
      assetPath: "/tmp/bhagavata-purana.vyview",
    });
    expect(plan.tag).toBe("vyview/bhagavata-purana");
    expect(plan.createArgs).toContain("vyasa-sa-wikisource/content-puranas");
    expect(plan.uploadArgs).toContain("--clobber");
  });
});