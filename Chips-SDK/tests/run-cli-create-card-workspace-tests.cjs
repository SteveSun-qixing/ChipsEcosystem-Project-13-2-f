/* eslint-disable no-console */
const assert = require('node:assert/strict');
const path = require('node:path');
const childProcess = require('node:child_process');
const fsp = require('node:fs/promises');
const os = require('node:os');

const projectRoot = path.resolve(__dirname, '..');
const ecosystemRoot = path.resolve(projectRoot, '..');
const cliPath = path.join(projectRoot, 'cli', 'index.js');

const run = (command, args, cwd, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const symlinkDir = async (source, target) => {
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  await fsp.symlink(source, target, type);
};

const main = async () => {
  console.log('Running chipsdev create card workspace integration tests...');

  const sandboxRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'chipsdev-create-card-workspace-'));
  const linkedEntries = ['Chips-SDK', 'Chips-Scaffold', 'Chips-ComponentLibrary'];

  try {
    for (const entry of linkedEntries) {
      await symlinkDir(path.join(ecosystemRoot, entry), path.join(sandboxRoot, entry));
    }

    await fsp.writeFile(
      path.join(sandboxRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'chips-ecosystem-workspace',
          private: true,
          workspaces: [
            'Chips-*',
            'Chips-BaseCardPlugin/*',
            'Chips-ComponentLibrary/packages/*',
            'Chips-ComponentLibrary/packages/adapters/*',
            'Chips-Scaffold/*',
            'ThemePack/*'
          ]
        },
        null,
        2
      ),
      'utf-8'
    );

    const env = {
      ...process.env,
      CHIPS_ECOSYSTEM_ROOT: sandboxRoot
    };

    const targetRelativePath = path.join('validation-projects', 'card-smoke');
    const targetDir = path.join(sandboxRoot, targetRelativePath);

    await run('node', [cliPath, 'create', 'card', targetRelativePath], sandboxRoot, env);

    const rootPackage = JSON.parse(await fsp.readFile(path.join(sandboxRoot, 'package.json'), 'utf-8'));
    assert.equal(rootPackage.workspaces.includes('validation-projects/card-smoke'), true);

    const createdPackage = JSON.parse(await fsp.readFile(path.join(targetDir, 'package.json'), 'utf-8'));
    assert.equal(createdPackage.devDependencies['chips-sdk'], '^0.1.0');
    assert.equal(createdPackage.devDependencies.vitest, '^3.0.8');
    assert.equal(createdPackage.devDependencies.jsdom, '^28.1.0');

    const chipsConfig = await fsp.readFile(path.join(targetDir, 'chips.config.mjs'), 'utf-8');
    assert.match(chipsConfig, /type:\s*"card"/);

    const manifestText = await fsp.readFile(path.join(targetDir, 'manifest.yaml'), 'utf-8');
    assert.match(manifestText, /entry:\s*dist\/index\.mjs/);

    const vitestConfig = await fsp.readFile(path.join(targetDir, 'vitest.config.mts'), 'utf-8');
    assert.match(vitestConfig, /environment:\s*"jsdom"/);

    await run('npm', ['install'], sandboxRoot, env);
    await run('npm', ['run', 'build'], targetDir, env);
    await run('npm', ['test'], targetDir, env);
    await run('npm', ['run', 'validate'], targetDir, env);
    await run('node', [cliPath, 'package'], targetDir, env);

    console.log('chipsdev create card workspace integration tests completed.');
  } finally {
    await fsp.rm(sandboxRoot, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
