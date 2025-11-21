#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";

import { Inquirerer, ListQuestion } from "inquirerer";
import minimist, { ParsedArgs } from "minimist";

import { cloneRepo } from "./clone";
import { createGen } from "./index";
import packageJson from "../package.json";

const DEFAULT_REPO = "https://github.com/launchql/pgpm-boilerplates.git";
const DEFAULT_PATH = ".";
const DEFAULT_OUTPUT_FALLBACK = "create-gen-app-output";

const PACKAGE_VERSION = packageJson.version ?? "0.0.0";

const RESERVED_ARG_KEYS = new Set([
  "_",
  "repo",
  "r",
  "branch",
  "b",
  "path",
  "p",
  "template",
  "t",
  "output",
  "o",
  "force",
  "f",
  "help",
  "h",
  "version",
  "v",
  "no-tty",
  "n",
]);

export interface CliResult {
  outputDir: string;
  template: string;
}

export async function runCli(rawArgv: string[] = process.argv.slice(2)): Promise<CliResult | void> {
  const args = minimist(rawArgv, {
    alias: {
      r: "repo",
      b: "branch",
      p: "path",
      t: "template",
      o: "output",
      f: "force",
      h: "help",
      v: "version",
      n: "no-tty",
    },
    string: ["repo", "branch", "path", "template", "output"],
    boolean: ["force", "help", "version", "no-tty"],
    default: {
      repo: DEFAULT_REPO,
      path: DEFAULT_PATH,
    },
  });

  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    printVersion();
    return;
  }

  if (!args.output && args._[0]) {
    args.output = args._[0];
  }

  let tempDir: string | null = null;
  try {
    console.log(`Cloning template from ${args.repo}...`);
    if (args.branch) {
      console.log(`Using branch ${args.branch}`);
    }
    tempDir = await cloneRepo(args.repo, { branch: args.branch });

    const selectionRoot = path.join(tempDir, args.path);
    if (!fs.existsSync(selectionRoot) || !fs.statSync(selectionRoot).isDirectory()) {
      throw new Error(`Template path "${args.path}" does not exist in ${args.repo}`);
    }

    const templates = fs
      .readdirSync(selectionRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();

    if (templates.length === 0) {
      throw new Error("No template folders found in repository");
    }

    let selectedTemplate: string | undefined = args.template;

    if (selectedTemplate) {
      if (!templates.includes(selectedTemplate)) {
        throw new Error(
          `Template "${selectedTemplate}" not found in ${args.repo}${
            args.path === "." ? "" : `/${args.path}`
          }`
        );
      }
    } else if (templates.length === 1) {
      selectedTemplate = templates[0];
      console.log(`Using the only available template: ${selectedTemplate}`);
    } else {
      selectedTemplate = await promptForTemplate(templates);
    }

    if (!selectedTemplate) {
      throw new Error("Template selection failed");
    }

    const normalizedBasePath =
      args.path === "." || args.path === "./"
        ? ""
        : args.path.replace(/^[./]+/, "").replace(/\/+$/, "");
    const fromPath = normalizedBasePath
      ? path.join(normalizedBasePath, selectedTemplate)
      : selectedTemplate;

    const outputDir = resolveOutputDir(args.output, selectedTemplate);
    ensureOutputDir(outputDir, Boolean(args.force));

    const answerOverrides = extractAnswerOverrides(args);
    const noTty = Boolean(args["no-tty"] ?? (args as Record<string, unknown>).noTty);

    await createGen({
      templateUrl: args.repo,
      fromBranch: args.branch,
      fromPath,
      outputDir,
      argv: answerOverrides,
      noTty,
    });

    console.log(`\n✨ Done! Project ready at ${outputDir}`);
    return { outputDir, template: selectedTemplate };
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

function printHelp(): void {
  console.log(`
create-gen-app CLI

Usage:
  create-gen-app [options] [outputDir]
  cga [options] [outputDir]

Options:
  -r, --repo <url>         Git repository to clone (default: ${DEFAULT_REPO})
  -b, --branch <name>      Branch to use when cloning
  -p, --path <dir>         Subdirectory that contains templates (default: .)
  -t, --template <name>    Template folder to use (will prompt if omitted)
  -o, --output <dir>       Output directory (defaults to ./<template>)
  -f, --force              Overwrite the output directory if it exists
  -v, --version            Show CLI version
  -n, --no-tty             Disable TTY mode for prompts
  -h, --help               Show this help message

You can also pass variable overrides, e.g.:
  create-gen-app --template module --PROJECT_NAME my-app
`);
}

function printVersion(): void {
  console.log(`create-gen-app v${PACKAGE_VERSION}`);
}

async function promptForTemplate(templates: string[]): Promise<string> {
  const prompter = new Inquirerer();
  const question: ListQuestion = {
    type: "list",
    name: "template",
    message: "Which template would you like to use?",
    options: templates,
    required: true,
  };

  try {
    const answers = (await prompter.prompt({}, [question])) as { template: string };
    return answers.template;
  } finally {
    if (typeof (prompter as any).close === "function") {
      (prompter as any).close();
    }
  }
}

function resolveOutputDir(outputArg: string | undefined, template?: string): string {
  const base = outputArg ?? (template ? path.join(process.cwd(), template) : DEFAULT_OUTPUT_FALLBACK);
  return path.resolve(base);
}

function ensureOutputDir(outputDir: string, force: boolean): void {
  if (!fs.existsSync(outputDir)) {
    return;
  }

  if (!force) {
    throw new Error(
      `Output directory "${outputDir}" already exists. Use --force to overwrite or choose another path.`
    );
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
}

function extractAnswerOverrides(args: ParsedArgs): Record<string, any> {
  const overrides: Record<string, any> = {};
  for (const [key, value] of Object.entries(args)) {
    if (RESERVED_ARG_KEYS.has(key)) {
      continue;
    }
    overrides[key] = value;
  }
  return overrides;
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

