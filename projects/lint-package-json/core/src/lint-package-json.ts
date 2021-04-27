import {sync as readPackageSync} from 'read-pkg';
import {writeFileSync} from 'fs';
import {sync as globby} from 'globby';
import {LinterRule, LinterRuleContext, loadConfig, PkgInfo} from './model';
import * as rules from './rules';
import {dirname} from 'path';

/**
 * Lints and eventually fix the `package.json` files matching the given glob
 * patterns given as argument.
 * @param input - List of `package.json` glob patterns
 * @param fix - True if the linter should try to fix issues, false otherwise
 * @param configFile - An optional configuration file to load
 * @public
 */
export function lintPackageJson(
  input: readonly string[],
  fix: boolean = false,
  configFile?: string
): void {
  const config = loadConfig(configFile);
  const files = findFiles(input);
  const packages = files.map<PkgInfo>(file => ({
    file,
    data: readPackageSync({cwd: dirname(file)})
  }));
  packages.forEach(pkg => {
    const context: LinterRuleContext = {
      fix,
      pkg,
      config,
      report: console.error
    };
    Object.values(rules).forEach((rule: LinterRule) => {
      rule.exec(context);
    });
    if (fix) {
      const json = JSON.stringify(pkg.data, undefined, '  ').concat('\n');
      writeFileSync(pkg.file, json, {encoding: 'utf-8'});
    }
  });
}

function findFiles(input: readonly string[]): string[] {
  return input.map(pattern => globby(pattern, {gitignore: true})).flat();
}
