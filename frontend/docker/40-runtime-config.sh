#!/bin/sh
# Vite `import.meta.env` build er somoy i JS e boshiye dey (bake), pore bodlano jay na।
# Tai backend URL container start er somoy config.js e likhi:
# API_URL bodlale sudhu container restart lagbe, image rebuild na।
set -eu

TARGET=/usr/share/nginx/html/config.js
API_URL="${API_URL:-http://localhost:8080}"

# JS string er jonno escape: \ ar " , newline bad (env e bhul kore ashle o JS bhangbe na)
escaped=$(printf '%s' "$API_URL" | tr -d '\r\n' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

printf 'window.__ENV__ = { API_URL: "%s" };\n' "$escaped" > "$TARGET"
echo "40-runtime-config: API_URL=$escaped -> $TARGET"
