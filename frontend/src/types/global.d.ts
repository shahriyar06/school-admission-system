// public/config.js theke asa runtime config
interface RuntimeEnv {
  API_URL?: string
}

interface Window {
  __ENV__?: RuntimeEnv
}
