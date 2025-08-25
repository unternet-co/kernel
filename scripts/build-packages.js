import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const packagesDir = 'packages';
const packages = readdirSync(packagesDir).filter((pkg) =>
  statSync(join(packagesDir, pkg)).isDirectory()
);

for (const pkg of packages) {
  const packagePath = join(packagesDir, pkg);
  console.log(`Building ${pkg}...`);
  execSync('npm run build', {
    stdio: 'inherit',
    cwd: packagePath,
  });
}
