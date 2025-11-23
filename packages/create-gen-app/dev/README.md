# Development Script

This script helps you test `create-gen-app` locally with the pgpm-boilerplates repository.

## Usage

From the `packages/create-gen-app` directory, run:

```bash
yarn dev [--repo url] [--branch name] [--path dir] [--template name] [--output dir]
```

Examples:

```bash
# Use the default repo and pick a template interactively
yarn dev

# Pin to a custom branch and template folder
yarn dev --branch feature/new-template --template module

# Change the output directory
yarn dev --output ./my-generated-template
```

## What it does

1. **Clones the default repository**: `https://github.com/launchql/pgpm-boilerplates/` (override via `--repo`, select branch via `--branch`)
2. **Lists available templates**: looks for subdirectories inside `--path` (default `.`; typically `module`, `workspace`)
3. **Prompts for selection**: Uses `inquirerer` to display an interactive list of templates
4. **Processes the template**:
   - Extracts variables from the selected folder
   - Discovers the `.questions.json` file if present
   - Prompts for variable values
   - Copies and processes files with replacements
5. **Generates output**: Creates the processed project in `./test-output`

## Configuration

Command-line flags override the defaults below (see `dev/index.ts`):

- `--repo` (`-r`): repository URL to clone (default: `https://github.com/launchql/pgpm-boilerplates/`)
- `--branch` (`-b`): branch or tag to checkout
- `--path` (`-p`): directory within the repo to scan for templates (default: `.`)
- `--template` (`-t`): template folder to use (e.g., `module`, `workspace`); if omitted, an interactive list appears
- `--output` (`-o`): output directory for generated project (default: `./test-output`)

## Example

```bash
$ yarn dev
🚀 create-gen-app development script

Cloning template from https://github.com/launchql/pgpm-boilerplates/...

Found 2 template(s): module, workspace

Which template would you like to use?
> module
  workspace

You selected: module

Extracting template variables...
...
✅ Project created successfully!
📁 Output directory: /path/to/test-output
```

## Notes

- The `test-output` directory is gitignored
- The temporary clone directory is automatically cleaned up after generation
- You can test different templates without affecting your workspace
