import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('../src/clone', () => ({
  cloneRepo: jest.fn()
}));

jest.mock('../src/extract', () => ({
  extractVariables: jest.fn()
}));

jest.mock('../src/prompt', () => ({
  promptUser: jest.fn()
}));

jest.mock('../src/replace', () => ({
  replaceVariables: jest.fn()
}));

import { cloneRepo } from '../src/clone';
import { createGen } from '../src';
import { extractVariables } from '../src/extract';
import { promptUser } from '../src/prompt';
import { replaceVariables } from '../src/replace';
import { ExtractedVariables } from '../src/types';

const mockCloneRepo = cloneRepo as jest.MockedFunction<typeof cloneRepo>;
const mockExtractVariables = extractVariables as jest.MockedFunction<typeof extractVariables>;
const mockPromptUser = promptUser as jest.MockedFunction<typeof promptUser>;
const mockReplaceVariables = replaceVariables as jest.MockedFunction<typeof replaceVariables>;

const baseExtractResult: ExtractedVariables = {
  fileReplacers: [],
  contentReplacers: [],
  projectQuestions: null
};

describe('createGen options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractVariables.mockResolvedValue(baseExtractResult);
    mockPromptUser.mockResolvedValue({});
    mockReplaceVariables.mockResolvedValue(undefined);
  });

  it('scopes extraction and replacement to fromPath', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-gen-spec-'));
    const subDir = path.join(tempDir, 'workspace');
    fs.mkdirSync(subDir);
    mockCloneRepo.mockResolvedValue(tempDir);

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-gen-output-'));

    await createGen({
      templateUrl: 'https://github.com/example/repo.git',
      outputDir,
      fromPath: 'workspace'
    });

    expect(mockCloneRepo).toHaveBeenCalledWith('https://github.com/example/repo.git', { branch: undefined });
    expect(mockExtractVariables).toHaveBeenCalledWith(subDir);
    expect(mockReplaceVariables).toHaveBeenCalledWith(subDir, outputDir, baseExtractResult, {});

    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('throws when fromPath does not exist', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-gen-spec-'));
    mockCloneRepo.mockResolvedValue(tempDir);

    await expect(
      createGen({
        templateUrl: 'https://github.com/example/repo.git',
        outputDir: path.join(os.tmpdir(), 'unused-output'),
        fromPath: 'missing'
      })
    ).rejects.toThrow('Template path "missing" does not exist');
  });

  it('passes fromBranch to cloneRepo', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-gen-spec-'));
    fs.mkdirSync(path.join(tempDir, 'module'));
    mockCloneRepo.mockResolvedValue(tempDir);
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-gen-output-'));

    await createGen({
      templateUrl: 'https://github.com/example/repo.git',
      outputDir,
      fromPath: 'module',
      fromBranch: 'feature/new-template'
    });

    expect(mockCloneRepo).toHaveBeenCalledWith('https://github.com/example/repo.git', {
      branch: 'feature/new-template'
    });
  });
});

