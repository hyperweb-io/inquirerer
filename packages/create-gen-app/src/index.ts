import * as fs from 'fs';
import * as path from 'path';

import { cloneRepo } from './clone';
import { extractVariables } from './extract';
import { promptUser } from './prompt';
import { replaceVariables } from './replace';
import { CreateGenOptions } from './types';

export * from './clone';
export * from './extract';
export * from './prompt';
export * from './replace';
export * from './types';

/**
 * Create a new project from a template repository
 * @param options - Options for creating the project
 * @returns Path to the generated project
 */
export async function createGen(options: CreateGenOptions): Promise<string> {
  const {
    templateUrl,
    outputDir,
    argv = {},
    noTty = false,
    fromBranch,
    fromPath
  } = options;
  
  console.log(`Cloning template from ${templateUrl}...`);
  const tempDir = await cloneRepo(templateUrl, { branch: fromBranch });
  const normalizedPath = fromPath ? path.normalize(fromPath) : '.';
  const templateRoot =
    normalizedPath && normalizedPath !== '.'
      ? path.join(tempDir, normalizedPath)
      : tempDir;
  
  try {
    if (!fs.existsSync(templateRoot)) {
      throw new Error(
        `Template path "${fromPath}" does not exist in repository ${templateUrl}.`
      );
    }
    console.log('Extracting template variables...');
    const extractedVariables = await extractVariables(templateRoot);
    
    console.log(`Found ${extractedVariables.fileReplacers.length} file replacers`);
    console.log(`Found ${extractedVariables.contentReplacers.length} content replacers`);
    if (extractedVariables.projectQuestions) {
      console.log(`Found ${extractedVariables.projectQuestions.questions.length} project questions`);
    }
    
    console.log('Prompting for variable values...');
    const answers = await promptUser(extractedVariables, argv, noTty);
    
    console.log(`Generating project in ${outputDir}...`);
    await replaceVariables(templateRoot, outputDir, extractedVariables, answers);
    
    console.log('Project created successfully!');
    
    return outputDir;
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
