import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise } from 'dependency-cruiser';
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';
import rules from '../.dependency-cruiser.cjs';

// 규칙의 경로와 실행 위치를 항상 저장소 루트 기준으로 맞춘다.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const targets = ['apps', 'packages'].flatMap((group) =>
  readdirSync(group, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${group}/${entry.name}`)
    .sort(),
);

for (const target of targets) {
  const configFile = resolve(target, 'tsconfig.json');
  const tsConfig = extractTSConfig(configFile);
  const { paths = {}, baseUrl, pathsBasePath } = tsConfig.options;
  // baseUrl 없는 tsconfig도 지원하도록 별칭을 선언 위치 기준 절대 경로로 변환한다.
  const alias = Object.fromEntries(
    Object.entries(paths).map(([pattern, destinations]) => [
      pattern.includes('*') ? pattern : `${pattern}$`,
      destinations.map((destination) => resolve(baseUrl ?? pathsBasePath ?? dirname(configFile), destination)),
    ]),
  );
  const result = await cruise(
    [target],
    {
      ...rules.options,
      ruleSet: rules,
      validate: true,
      outputType: 'err',
      enhancedResolveOptions: { ...rules.options.enhancedResolveOptions, alias },
      cache: {
        folder: `node_modules/.cache/dependency-cruiser/${target}`,
        strategy: 'metadata',
        compress: true,
      },
    },
    {},
    { tsConfig },
  );
  console.log(`${target}\n${result.output}`);
  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
    break;
  }
}
