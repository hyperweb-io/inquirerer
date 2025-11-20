import { Question } from 'inquirerer';

/**
 * Questions configuration that can be loaded from .questions.json or .questions.js
 * @typedef {Object} Questions
 * @property {Question[]} questions - Array of inquirerer questions
 */
export interface Questions {
  questions: Question[];
  ignore?: string[];
}

/**
 * Variable extracted from filename patterns like ____VARIABLE____
 */
export interface FileReplacer {
  variable: string;
  pattern: RegExp;
}

/**
 * Variable extracted from file content patterns like ____VARIABLE____
 */
export interface ContentReplacer {
  variable: string;
  pattern: RegExp;
}

/**
 * Options for creating a new project from a template
 */
export interface CreateGenOptions {
  /**
   * URL or path to the template repository
   */
  templateUrl: string;
  
  /**
   * Optional branch or tag to checkout after cloning
   */
  fromBranch?: string;

  /**
   * Path inside the repository to use as the template root
   */
  fromPath?: string;

  /**
   * Destination directory for the generated project
   */
  outputDir: string;
  
  /**
   * Command-line arguments to pre-populate answers
   */
  argv?: Record<string, any>;
  
  /**
   * Whether to use TTY for interactive prompts
   */
  noTty?: boolean;
}

/**
 * Result of extracting variables from a template
 */
export interface ExtractedVariables {
  fileReplacers: FileReplacer[];
  contentReplacers: ContentReplacer[];
  projectQuestions: Questions | null;
}

/**
 * Context for processing a template
 */
export interface TemplateContext {
  tempDir: string;
  extractedVariables: ExtractedVariables;
  answers: Record<string, any>;
}
