// Vite `import.meta.env` build er somoy i code e boshiye dey (bake kore), pore ar bodlano jay na।
// Tai Docker e ekoi build image different backend URL diye chalate runtime `config.js` lage:
// container start er somoy `window.__ENV__.API_URL` likhe dile rebuild chara URL bodlay।
// Priority: runtime config → build-time VITE_API_URL → local default
const rawApiUrl =
  window.__ENV__?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080'

// Sheshe "/" thakle bad, jate `${apiBaseUrl}/classes` e "//" na hoy
export const apiBaseUrl = rawApiUrl.replace(/\/+$/, '')
