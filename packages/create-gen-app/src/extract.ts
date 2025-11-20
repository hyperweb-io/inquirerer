import * as fs from "fs";
import * as path from "path";

import {
  ContentReplacer,
  ExtractedVariables,
  FileReplacer,
  Questions,
} from "./types";

/**
 * Pattern to match __VARIABLE__ in filenames and content
 */
const VARIABLE_PATTERN = /__([A-Za-z_][A-Za-z0-9_]*)__/g;

/**
 * Extract all variables from a template directory
 * @param templateDir - Path to the template directory
 * @returns Extracted variables including file replacers, content replacers, and project questions
 */
export async function extractVariables(
  templateDir: string
): Promise<ExtractedVariables> {
  const fileReplacers: FileReplacer[] = [];
  const contentReplacers: ContentReplacer[] = [];
  const fileReplacerVars = new Set<string>();
  const contentReplacerVars = new Set<string>();

  const projectQuestions = await loadProjectQuestions(templateDir);
  const ignoredPatterns = new Set<string>(projectQuestions?.ignore ?? []);

  await walkDirectory(templateDir, async (filePath) => {
    const relativePath = path.relative(templateDir, filePath);
    if (shouldIgnore(relativePath, ignoredPatterns)) {
      return;
    }

    if (
      relativePath === ".questions.json" ||
      relativePath === ".questions.js"
    ) {
      return;
    }

    const matches = relativePath.matchAll(VARIABLE_PATTERN);
    for (const match of matches) {
      const varName = match[1];
      if (!fileReplacerVars.has(varName)) {
        fileReplacerVars.add(varName);
        fileReplacers.push({
          variable: varName,
          pattern: new RegExp(`__${varName}__`, "g"),
        });
      }
    }

    const contentVars = await extractFromFileContent(filePath, ignoredPatterns);
    for (const varName of contentVars) {
      if (!contentReplacerVars.has(varName)) {
        contentReplacerVars.add(varName);
        contentReplacers.push({
          variable: varName,
          pattern: new RegExp(`__${varName}__`, "g"),
        });
      }
    }
  });

  return {
    fileReplacers,
    contentReplacers,
    projectQuestions,
  };
}

/**
 * Extract variables from file content using streams
 * @param filePath - Path to the file
 * @returns Set of variable names found in the file
 */
async function extractFromFileContent(
  filePath: string,
  ignoredPatterns: Set<string>
): Promise<Set<string>> {
  const variables = new Set<string>();

  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    let buffer = "";

    stream.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();

      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

      for (const line of lines) {
        const matches = line.matchAll(VARIABLE_PATTERN);
        for (const match of matches) {
          if (!shouldIgnoreContent(match[0], ignoredPatterns)) {
            variables.add(match[1]);
          }
        }
      }
    });

    stream.on("end", () => {
      const matches = buffer.matchAll(VARIABLE_PATTERN);
      for (const match of matches) {
        if (!shouldIgnoreContent(match[0], ignoredPatterns)) {
          variables.add(match[1]);
        }
      }
      resolve(variables);
    });

    stream.on("error", () => {
      resolve(variables);
    });
  });
}

/**
 * Walk through a directory recursively
 * @param dir - Directory to walk
 * @param callback - Callback function for each file
 */
async function walkDirectory(
  dir: string,
  callback: (filePath: string) => Promise<void>
): Promise<void> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(fullPath, callback);
    } else if (entry.isFile()) {
      await callback(fullPath);
    }
  }
}

/**
 * Load project questions from .questions.json or .questions.js
 * @param templateDir - Path to the template directory
 * @returns Questions object or null if not found
 */
async function loadProjectQuestions(
  templateDir: string
): Promise<Questions | null> {
  const jsonPath = path.join(templateDir, ".questions.json");
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, "utf8");
      const questions = JSON.parse(content);
      return validateQuestions(questions) ? questions : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(`Failed to parse .questions.json: ${errorMessage}`);
    }
  }

  const jsPath = path.join(templateDir, ".questions.js");
  if (fs.existsSync(jsPath)) {
    try {
      const module = require(jsPath);
      const questions = module.default || module;
      return validateQuestions(questions) ? questions : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(`Failed to load .questions.js: ${errorMessage}`);
    }
  }

  return null;
}

function shouldIgnore(
  relativePath: string,
  ignoredPatterns: Set<string>
): boolean {
  if (ignoredPatterns.size === 0) {
    return false;
  }
  const normalized = relativePath.split(path.sep).join("/");
  const segments = normalized.split("/");

  for (const pattern of ignoredPatterns) {
    const normalizedPattern = pattern.split(path.sep).join("/");

    if (normalizedPattern === normalized) {
      return true;
    }

    if (!normalizedPattern.includes("/")) {
      if (segments.includes(normalizedPattern)) {
        return true;
      }
      continue;
    }

    if (normalizedPattern.startsWith("**/")) {
      const suffix = normalizedPattern.slice(3);
      if (normalized.endsWith(suffix)) {
        return true;
      }
      continue;
    }

    if (normalizedPattern.endsWith("/**")) {
      const prefix = normalizedPattern.slice(0, -3);
      if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
        return true;
      }
      continue;
    }

    if (normalized.startsWith(`${normalizedPattern}/`)) {
      return true;
    }
  }
  return false;
}

const DEFAULT_IGNORED_CONTENT = new Set(["__tests__", "__snapshots__"]);

function shouldIgnoreContent(
  match: string,
  ignoredPatterns: Set<string>
): boolean {
  if (ignoredPatterns.size === 0 && DEFAULT_IGNORED_CONTENT.size === 0) {
    return false;
  }
  const normalizedMatch = match.slice(2, -2);
  return (
    ignoredPatterns.has(match) ||
    ignoredPatterns.has(normalizedMatch) ||
    DEFAULT_IGNORED_CONTENT.has(match) ||
    DEFAULT_IGNORED_CONTENT.has(normalizedMatch)
  );
}

/**
 * Validate that the questions object has the correct structure
 * @param obj - Object to validate
 * @returns True if valid, false otherwise
 */
function validateQuestions(obj: any): obj is Questions {
  return obj && typeof obj === "object" && Array.isArray(obj.questions);
}
