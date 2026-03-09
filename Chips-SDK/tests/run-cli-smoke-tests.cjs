/* eslint-disable no-console */
const path = require('node:path');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'cli', 'index.js');

const run = (args, cwd = projectRoot) =>
  new Promise((resolve, reject) => {
    const child = childProcess.spawn('node', [cliPath, ...args], {
      cwd,
      stdio: 'inherit',
      env: process.env
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`chipsdev ${args.join(' ')} exited with code ${code}`));
    });
  });

const runBinary = (command, args, cwd, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const main = async () => {
  console.log('Running chipsdev CLI smoke tests...');
  await run(['help']);
  await run(['version']);

  const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'chipsdev-local-bin-'));
  fs.writeFileSync(
    path.join(tempProject, 'package.json'),
    JSON.stringify(
      {
        name: 'chipsdev-local-bin-smoke',
        private: true,
        devDependencies: {
          'chips-sdk': `file:${projectRoot}`
        }
      },
      null,
      2
    )
  );

  try {
    await runBinary('npm', ['install'], tempProject);
    await runBinary('chipsdev', ['help'], tempProject);
  } finally {
    fs.rmSync(tempProject, { recursive: true, force: true });
  }

  console.log('chipsdev CLI smoke tests completed.');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
