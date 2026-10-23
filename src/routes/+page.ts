// Browser only: the page needs `window`, and the shuffled municipality order differs on every
// load, so server rendered HTML would never match what the browser builds.
export const ssr = false;
