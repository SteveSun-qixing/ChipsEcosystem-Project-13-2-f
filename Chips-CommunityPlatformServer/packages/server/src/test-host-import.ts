import { HostApplication } from 'chips-host/host-application';
import * as path from 'path';

async function test() {
  console.log('HostApplication imported');
  const host = new HostApplication({
    workspacePath: path.resolve('./.test-host-workspace')
  });
  void host;
  console.log('HostApplication instance created');
}

test().catch(console.error);
