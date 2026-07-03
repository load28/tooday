// 루트 공용 규칙 + @/* 별칭 해석(webpack.depcruise.cjs). 루트 cwd에서 실행된다.
const path = require('node:path');
const base = require('../../.dependency-cruiser.cjs');

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  ...base,
  options: {
    ...base.options,
    webpackConfig: { fileName: path.join(__dirname, 'webpack.depcruise.cjs') },
    cache: { ...base.options.cache, folder: 'node_modules/.cache/dependency-cruiser/design-guide' },
  },
};
