import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface CloneOptions {
  branch?: string;
}

/**
 * Clone a repository to a temporary directory
 * @param url - Repository URL (GitHub or any git URL)
 * @returns Path to the cloned repository
 */
export async function cloneRepo(url: string, options: CloneOptions = {}): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-gen-'));
  const { branch } = options;
  
  try {
    const gitUrl = normalizeGitUrl(url);
    const branchArgs = branch ? ` --branch ${branch} --single-branch` : '';
    
    execSync(`git clone${branchArgs} ${gitUrl} ${tempDir}`, {
      stdio: 'inherit'
    });
    
    const gitDir = path.join(tempDir, '.git');
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }
    
    return tempDir;
  } catch (error) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone repository: ${errorMessage}`);
  }
}

/**
 * Normalize a URL to a git-cloneable format
 * @param url - Input URL
 * @returns Normalized git URL
 */
function normalizeGitUrl(url: string): string {
  if (url.startsWith('git@') || url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  
  if (/^[\w-]+\/[\w-]+$/.test(url)) {
    return `https://github.com/${url}.git`;
  }
  
  return url;
}
