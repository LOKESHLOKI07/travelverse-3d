/**
 * Logo is served from `public/assets/` (URL path `/assets/...`) instead of a bundled
 * import so it loads correctly when using the dev server from another device (LAN IP)
 * and on static hosting.
 */
export const LOGO_URL = `${import.meta.env.BASE_URL}assets/mountain_explorers_logo.png`;
