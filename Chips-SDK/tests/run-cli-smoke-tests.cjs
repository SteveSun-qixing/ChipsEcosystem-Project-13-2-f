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

  const buildProject = fs.mkdtempSync(path.join(os.tmpdir(), 'chipsdev-build-smoke-'));
  fs.writeFileSync(
    path.join(buildProject, 'chips.config.mjs'),
    [
      'export default {',
      "  type: 'app',",
      "  srcDir: 'src',",
      "  outDir: 'dist',",
      "  entry: 'index.html',",
      "  testsDir: 'tests'",
      '};'
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(buildProject, 'manifest.yaml'),
    [
      'id: chips.build.smoke',
      'version: "1.0.0"',
      'type: app',
      'name: Build Smoke Plugin',
      'permissions: []',
      'entry: dist/index.html'
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(buildProject, 'index.html'),
    '<!doctype html><html><body><div id="app"></div></body></html>'
  );

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
    await run(['build'], buildProject);
    if (!fs.existsSync(path.join(buildProject, 'dist', 'index.html'))) {
      throw new Error('chipsdev build did not produce dist/index.html');
    }
    if (fs.existsSync(path.join(buildProject, 'dist', 'manifest.yaml'))) {
      throw new Error('chipsdev build must not copy manifest.yaml into dist/');
    }

    await runBinary('npm', ['install'], tempProject);
    await runBinary('chipsdev', ['help'], tempProject);
  } finally {
    fs.rmSync(buildProject, { recursive: true, force: true });
    fs.rmSync(tempProject, { recursive: true, force: true });
  }

  console.log('chipsdev CLI smoke tests completed.');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
