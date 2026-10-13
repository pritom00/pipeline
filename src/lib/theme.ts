export const THEME_KEY = 'pipeline:theme';

/** Runs before first paint so there is no flash of the wrong theme. Follows the system until the user picks one. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){document.documentElement.classList.add('dark');}})();`;
