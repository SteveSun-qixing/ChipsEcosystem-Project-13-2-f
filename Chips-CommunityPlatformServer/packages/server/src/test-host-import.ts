import { HostApplication } from 'chips-host/src/main/core/host-application';
import * as path from 'path';

async function test() {
  console.log('HostApplication imported');
  const host = new HostApplication({
    workspacePath: path.resolve('./.test-host-workspace')
  });
  console.log('HostApplication instance created');
}

test().catch(console.error);
