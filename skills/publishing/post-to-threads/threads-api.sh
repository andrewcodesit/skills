#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://graph.threads.net/v1.0"
TOKEN="${THREADS_ACCESS_TOKEN:?THREADS_ACCESS_TOKEN not set in env — add it to ~/.claude/settings.json}"

get_user_id() {
  local response
  response=$(curl -s --max-time 15 \
    -H "Authorization: Bearer ${TOKEN}" \
    "${BASE_URL}/me?fields=id")
  echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    print('API error: ' + d['error'].get('message', str(d['error'])), file=sys.stderr)
    sys.exit(1)
print(d['id'])
"
}

create_container() {
  local user_id="$1"
  local text="$2"
  local image_url="${3:-}"
  local reply_to="${4:-}"

  local args=(-s --max-time 15 -X POST "${BASE_URL}/${user_id}/threads"
    -H "Authorization: Bearer ${TOKEN}"
    --data-urlencode "text=${text}")

  if [[ -n "$image_url" ]]; then
    args+=(--data-urlencode "media_type=IMAGE"
           --data-urlencode "image_url=${image_url}")
  else
    args+=(--data-urlencode "media_type=TEXT")
  fi

  if [[ -n "$reply_to" ]]; then
    args+=(--data-urlencode "reply_to_id=${reply_to}")
  fi

  local response
  response=$(curl "${args[@]}")
  echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    print('API error: ' + d['error'].get('message', str(d['error'])), file=sys.stderr)
    sys.exit(1)
print(d['id'])
"
}

wait_ready() {
  local container_id="$1"
  local max_attempts=10

  for ((i=0; i<max_attempts; i++)); do
    local response status
    response=$(curl -s --max-time 15 \
      -H "Authorization: Bearer ${TOKEN}" \
      "${BASE_URL}/${container_id}?fields=status,error_message")
    status=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")

    case "$status" in
      FINISHED) return 0 ;;
      ERROR)
        echo "$response" | python3 -c \
          "import sys,json; d=json.load(sys.stdin); print('Container error: ' + d.get('error_message','unknown'))" >&2
        return 1 ;;
    esac
    sleep 3
  done

  echo "Timeout: container ${container_id} not ready after 10 attempts" >&2
  return 1
}

publish_container() {
  local user_id="$1"
  local container_id="$2"

  local response
  response=$(curl -s --max-time 15 -X POST "${BASE_URL}/${user_id}/threads_publish" \
    -H "Authorization: Bearer ${TOKEN}" \
    --data-urlencode "creation_id=${container_id}")
  echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    print('API error: ' + d['error'].get('message', str(d['error'])), file=sys.stderr)
    sys.exit(1)
print(d['id'])
"
}

CMD="${1:?Usage: ./threads-api.sh post \"text\" [image_url]  OR  ./threads-api.sh reply \"text\" <reply_to_id> [image_url]  OR  ./threads-api.sh refresh}"

refresh_token() {
  local response
  response=$(curl -s --max-time 15 \
    "https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${TOKEN}")
  echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    print('API error: ' + d['error'].get('message', str(d['error'])), file=sys.stderr)
    sys.exit(1)
print(d['access_token'])
"
}

case "$CMD" in
  post)
    TEXT="${2:?text required for post}"
    IMAGE="${3:-}"
    USER_ID=$(get_user_id)
    CID=$(create_container "$USER_ID" "$TEXT" "$IMAGE" "")
    wait_ready "$CID" || exit 1
    publish_container "$USER_ID" "$CID"
    ;;
  reply)
    TEXT="${2:?text required for reply}"
    REPLY_TO="${3:?reply_to_id required for reply}"
    IMAGE="${4:-}"
    USER_ID=$(get_user_id)
    CID=$(create_container "$USER_ID" "$TEXT" "$IMAGE" "$REPLY_TO")
    wait_ready "$CID" || exit 1
    publish_container "$USER_ID" "$CID"
    ;;
  refresh)
    refresh_token
    ;;
  *)
    echo "Unknown command: ${CMD}. Valid: post, reply, refresh" >&2
    exit 1 ;;
esac
