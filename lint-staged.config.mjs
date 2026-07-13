export default {
  '*.{ts,tsx,vue,js,mjs}': ['eslint --fix --no-warn-ignored', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
};
