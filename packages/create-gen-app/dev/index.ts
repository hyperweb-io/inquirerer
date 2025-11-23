import * as fs from "fs";
import { Inquirerer, ListQuestion } from "inquirerer";
import minimist from "minimist";
import * as path from "path";

import { cloneRepo } from "../src/clone";
import { extractVariables } from "../src/extract";
import { promptUser } from "../src/prompt";
import { replaceVariables } from "../src/replace";

const DEFAULT_REPO = "https://github.com/launchql/pgpm-boilerplates/";
const DEFAULT_DIRECTORY = ".";
const OUTPUT_DIR = "./test-output";

const argv = minimist(process.argv.slice(2), {
  alias: {
    r: "repo",
    b: "branch",
    p: "path",
    t: "template",
    o: "output",
  },
  string: ["repo", "branch", "path", "template", "output"],
  default: {
    repo: DEFAULT_REPO,
    path: DEFAULT_DIRECTORY,
    output: OUTPUT_DIR,
  },
});

async function main() {
  console.log("🚀 create-gen-app development script\n");

  try {
    // Clone the default repository
    console.log(`Cloning template from ${argv.repo}...`);
    if (argv.branch) {
      console.log(`Using branch ${argv.branch}`);
    }
    const tempDir = await cloneRepo(argv.repo, { branch: argv.branch });

    // List folders in the repository
    const templateDir = path.join(tempDir, argv.path);
    if (!fs.existsSync(templateDir)) {
      throw new Error(
        `Template path "${argv.path}" does not exist in ${argv.repo}`
      );
    }
    const folders = fs
      .readdirSync(templateDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith("."))
      .map((dirent) => dirent.name);

    if (folders.length === 0) {
      throw new Error("No template folders found in repository");
    }

    console.log(
      `\nFound ${folders.length} template(s): ${folders.join(", ")}\n`
    );

    let selectedFolder = argv.template;
    if (selectedFolder) {
      if (!folders.includes(selectedFolder)) {
        throw new Error(
          `Template "${selectedFolder}" not found in ${argv.repo}${argv.path === "." ? "" : `/${argv.path}`}`
        );
      }
    } else {
      // Use inquirerer to prompt for folder selection
      const inquirerer = new Inquirerer();
      const question: ListQuestion = {
        type: "list",
        name: "template",
        message: "Which template would you like to use?",
        options: folders,
        required: true,
      };

      try {
        const answers = (await inquirerer.prompt({}, [question])) as {
          template: string;
        };
        selectedFolder = answers.template;
      } finally {
        inquirerer.close();
      }
    }

    console.log(`\nYou selected: ${selectedFolder}\n`);

    // Use the selected folder as the template source
    const selectedTemplateDir = path.join(templateDir, selectedFolder);

    console.log("Extracting template variables...");
    const extractedVariables = await extractVariables(selectedTemplateDir);

    console.log(
      `Found ${extractedVariables.fileReplacers.length} file replacers`
    );
    console.log(
      `Found ${extractedVariables.contentReplacers.length} content replacers`
    );
    if (extractedVariables.projectQuestions) {
      console.log(
        `Found ${extractedVariables.projectQuestions.questions.length} project questions`
      );
    }

    console.log("\nPrompting for variable values...");
    const variableAnswers = await promptUser(extractedVariables, {}, false);

    // Ensure output directory exists
    const absoluteOutputDir = path.resolve(argv.output);
    if (fs.existsSync(absoluteOutputDir)) {
      console.log(`\nRemoving existing output directory: ${absoluteOutputDir}`);
      fs.rmSync(absoluteOutputDir, { recursive: true, force: true });
    }

    console.log(`\nGenerating project in ${absoluteOutputDir}...`);
    await replaceVariables(
      selectedTemplateDir,
      absoluteOutputDir,
      extractedVariables,
      variableAnswers
    );

    console.log("\n✅ Project created successfully!");
    console.log(`📁 Output directory: ${absoluteOutputDir}\n`);

    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
