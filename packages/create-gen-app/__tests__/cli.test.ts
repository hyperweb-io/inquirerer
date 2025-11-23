import * as fs from "fs";
import * as path from "path";

import { runCli } from "../src/cli";
import {
  TEST_BRANCH,
  TEST_REPO,
  TEST_TEMPLATE,
  buildAnswers,
  cleanupWorkspace,
  createTempWorkspace,
} from "../test-utils/integration-helpers";

jest.setTimeout(180_000);

describe("CLI integration (GitHub templates)", () => {
  it("generates a project using the real repo", async () => {
    const workspace = createTempWorkspace("cli");
    const answers = buildAnswers("cli");

    const args = [
      "--repo",
      TEST_REPO,
      "--branch",
      TEST_BRANCH,
      "--path",
      ".",
      "--template",
      TEST_TEMPLATE,
      "--output",
      workspace.outputDir,
      "--no-tty",
    ];

    for (const [key, value] of Object.entries(answers)) {
      args.push(`--${key}`, value);
    }

    try {
      const result = await runCli(args);
      expect(result).toBeDefined();
      if (!result) {
        return;
      }

      expect(result.template).toBe(TEST_TEMPLATE);
      expect(result.outputDir).toBe(path.resolve(workspace.outputDir));

      const pkgPath = path.join(workspace.outputDir, "package.json");
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      expect(pkg.name).toBe(answers.PACKAGE_IDENTIFIER);
      expect(pkg.license).toBe(answers.LICENSE);

      const licenseContent = fs.readFileSync(
        path.join(workspace.outputDir, "LICENSE"),
        "utf8"
      );
      expect(licenseContent).toContain("MIT License");
      expect(licenseContent).toContain(answers.USERFULLNAME);
    } finally {
      cleanupWorkspace(workspace);
    }
  });

  it("prints version and exits when --version is provided", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await runCli(["--version"]);

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/create-gen-app v/));
    logSpy.mockRestore();
  });
});

