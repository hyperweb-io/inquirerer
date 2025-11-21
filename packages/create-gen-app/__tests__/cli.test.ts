import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("../src/clone", () => ({
  cloneRepo: jest.fn(),
}));

jest.mock("../src", () => ({
  createGen: jest.fn(),
}));

import { runCli } from "../src/cli";
import { cloneRepo } from "../src/clone";
import { createGen } from "../src";

const mockCloneRepo = cloneRepo as jest.MockedFunction<typeof cloneRepo>;
const mockCreateGen = createGen as jest.MockedFunction<typeof createGen>;

function makeTempTemplateRoot(structure: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cga-cli-test-"));
  for (const folder of structure) {
    fs.mkdirSync(path.join(root, folder), { recursive: true });
  }
  return root;
}

describe("CLI", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("invokes createGen with provided template and overrides", async () => {
    const repoRoot = makeTempTemplateRoot(["module", "workspace"]);
    mockCloneRepo.mockResolvedValue(repoRoot);
    mockCreateGen.mockResolvedValue("/tmp/output");

    const outputDir = path.join(os.tmpdir(), "cga-cli-output");
    const result = await runCli([
      "--template",
      "module",
      "--output",
      outputDir,
      "--LICENSE",
      "Apache-2.0",
    ]);

    expect(result).toEqual({
      outputDir: path.resolve(outputDir),
      template: "module",
    });
    expect(mockCreateGen).toHaveBeenCalledTimes(1);
    expect(mockCreateGen).toHaveBeenCalledWith({
      templateUrl: "https://github.com/launchql/pgpm-boilerplates.git",
      fromBranch: undefined,
      fromPath: "module",
      outputDir: path.resolve(outputDir),
      argv: { LICENSE: "Apache-2.0" },
      noTty: false,
    });
    expect(fs.existsSync(repoRoot)).toBe(false);
  });

  it("auto-selects template when only one exists and enforces default output name", async () => {
    const repoRoot = makeTempTemplateRoot(["module"]);
    mockCloneRepo.mockResolvedValue(repoRoot);
    mockCreateGen.mockResolvedValue("/tmp/output");

    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "cga-cli-cwd-"));
    const originalCwd = process.cwd();
    process.chdir(cwd);

    try {
      const resolvedCwd = fs.realpathSync(cwd);
      await runCli([]);

      expect(mockCreateGen).toHaveBeenCalledWith(
        expect.objectContaining({
          fromPath: "module",
          outputDir: path.resolve(path.join(resolvedCwd, "module")),
        })
      );
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("throws when output directory exists without --force", async () => {
    const repoRoot = makeTempTemplateRoot(["module"]);
    mockCloneRepo.mockResolvedValue(repoRoot);
    mockCreateGen.mockResolvedValue("/tmp/output");

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "cga-cli-existing-"));

    try {
      await expect(
        runCli(["--template", "module", "--output", outputDir])
      ).rejects.toThrow("Output directory");
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("prints version and exits when --version is provided", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    await runCli(["--version"]);

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/create-gen-app v/));
    expect(mockCloneRepo).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

