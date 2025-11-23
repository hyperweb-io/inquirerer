import * as fs from 'fs';
import * as path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

import { ExtractedVariables } from './types';
import { renderLicense, isSupportedLicense } from './licenses';

/**
 * Replace variables in all files in the template directory
 * @param templateDir - Path to the template directory
 * @param outputDir - Path to the output directory
 * @param extractedVariables - Variables extracted from the template
 * @param answers - User answers for variable values
 */
export async function replaceVariables(
  templateDir: string,
  outputDir: string,
  extractedVariables: ExtractedVariables,
  answers: Record<string, any>
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  await walkAndReplace(templateDir, outputDir, extractedVariables, answers);
  await ensureLicenseFile(outputDir, answers);
}

/**
 * Walk through directory and replace variables in files and filenames
 * @param sourceDir - Source directory
 * @param destDir - Destination directory
 * @param extractedVariables - Variables extracted from the template
 * @param answers - User answers for variable values
 * @param sourceRelativePath - Current relative path in source (for recursion)
 * @param destRelativePath - Current relative path in destination (for recursion)
 */
async function walkAndReplace(
  sourceDir: string,
  destDir: string,
  extractedVariables: ExtractedVariables,
  answers: Record<string, any>,
  sourceRelativePath: string = '',
  destRelativePath: string = ''
): Promise<void> {
  const currentSource = path.join(sourceDir, sourceRelativePath);
  const entries = fs.readdirSync(currentSource, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourceEntryPath = path.join(currentSource, entry.name);
    
    if (entry.name === '.questions.json' || entry.name === '.questions.js') {
      continue;
    }
    
    let newName = entry.name;
    for (const replacer of extractedVariables.fileReplacers) {
      if (answers[replacer.variable] !== undefined) {
        newName = newName.replace(replacer.pattern, String(answers[replacer.variable]));
      }
    }
    
    const destEntryPath = path.join(destDir, destRelativePath, newName);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destEntryPath)) {
        fs.mkdirSync(destEntryPath, { recursive: true });
      }
      await walkAndReplace(
        sourceDir,
        destDir,
        extractedVariables,
        answers,
        path.join(sourceRelativePath, entry.name),
        path.join(destRelativePath, newName)
      );
    } else if (entry.isFile()) {
      await replaceInFile(sourceEntryPath, destEntryPath, extractedVariables, answers);
    }
  }
}

async function ensureLicenseFile(
  outputDir: string,
  answers: Record<string, any>
): Promise<void> {
  const licenseValue = answers?.LICENSE;
  if (typeof licenseValue !== 'string' || licenseValue.trim() === '') {
    return;
  }

  const selectedLicense = licenseValue.trim();
  if (!isSupportedLicense(selectedLicense)) {
    console.warn(
      `[create-gen-app] License "${selectedLicense}" is not supported by the built-in templates. Leaving template LICENSE file as-is.`
    );
    return;
  }

  const author =
    answers?.USERFULLNAME ??
    answers?.AUTHOR ??
    answers?.AUTHORFULLNAME ??
    answers?.USERNAME ??
    'Unknown Author';

  const email = answers?.USEREMAIL ?? answers?.EMAIL ?? '';

  const content = renderLicense(selectedLicense, {
    author: String(author),
    email: String(email || ''),
  });

  if (!content) {
    return;
  }

  const licensePath = path.join(outputDir, 'LICENSE');
  fs.mkdirSync(path.dirname(licensePath), { recursive: true });
  fs.writeFileSync(licensePath, content.trimEnd() + '\n', 'utf8');
  console.log(
    `[create-gen-app] LICENSE updated with ${selectedLicense} template.`
  );
}

/**
 * Replace variables in a file using streams
 * @param sourcePath - Source file path
 * @param destPath - Destination file path
 * @param extractedVariables - Variables extracted from the template
 * @param answers - User answers for variable values
 */
async function replaceInFile(
  sourcePath: string,
  destPath: string,
  extractedVariables: ExtractedVariables,
  answers: Record<string, any>
): Promise<void> {
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const replaceTransform = new Transform({
    transform(chunk: Buffer, encoding, callback) {
      let content = chunk.toString();
      
      for (const replacer of extractedVariables.contentReplacers) {
        if (answers[replacer.variable] !== undefined) {
          content = content.replace(replacer.pattern, String(answers[replacer.variable]));
        }
      }
      
      callback(null, Buffer.from(content));
    }
  });
  
  try {
    await pipeline(
      fs.createReadStream(sourcePath),
      replaceTransform,
      fs.createWriteStream(destPath)
    );
  } catch (error) {
    fs.copyFileSync(sourcePath, destPath);
  }
}
