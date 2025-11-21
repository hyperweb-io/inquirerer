import * as fs from "fs";
import * as path from "path";

import { createGen } from "../src";
import {
  TEST_BRANCH,
  TEST_REPO,
  TEST_TEMPLATE,
  buildAnswers,
  cleanupWorkspace,
  createTempWorkspace,
} from "../test-utils/integration-helpers";

jest.setTimeout(180_000);

describe("createGen integration (GitHub templates)", () => {
  it("clones the default repo and generates the module template", async () => {
    const workspace = createTempWorkspace("flow");

    try {
      const answers = buildAnswers("flow");
      const result = await createGen({
        templateUrl: TEST_REPO,
        fromBranch: TEST_BRANCH,
        fromPath: TEST_TEMPLATE,
        outputDir: workspace.outputDir,
        argv: answers,
        noTty: true,
      });

      expect(result).toBe(workspace.outputDir);

      const packageJsonPath = path.join(workspace.outputDir, "package.json");
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      expect(pkg.name).toBe(answers.PACKAGE_IDENTIFIER);
      expect(pkg.license).toBe(answers.LICENSE);
      expect(pkg.author).toContain(answers.USERFULLNAME);

      const questionsJsonPath = path.join(
        workspace.outputDir,
        ".questions.json"
      );
      expect(fs.existsSync(questionsJsonPath)).toBe(false);

      const licensePath = path.join(workspace.outputDir, "LICENSE");
      expect(fs.existsSync(licensePath)).toBe(true);
      const licenseContent = fs.readFileSync(licensePath, "utf8");
      expect(licenseContent).toContain(answers.USERFULLNAME);
      expect(licenseContent).toContain("MIT License");
    } finally {
      cleanupWorkspace(workspace);
    }
  });
});

