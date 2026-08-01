// dependency-cruiser 전용 resolve 설정 — tsconfig의 별칭과 동일해야 한다.
const path = require('node:path');

module.exports = {
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
      '@bff': path.join(__dirname, '../bff/src'),
    },
  },
};
