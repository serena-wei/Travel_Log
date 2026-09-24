#!/usr/bin/env bash
# Promote existing users to ADMIN / EDITOR (local or production).
#
# Connection uses libpq env vars (same as psql), with local docker-compose defaults:
#   PGHOST=localhost PGPORT=5432 PGUSER=travellog PGPASSWORD=travellog PGDATABASE=travellog
#
# Usage:
#   ./scripts/promote-roles.sh --admin Serena,demo_mei --editor demo_liam,demo_ava
#   ./scripts/promote-roles.sh --admin Serena --dry-run
#
# Production (example — never commit real password):
#   PGHOST=YOUR_RDS_ENDPOINT PGPORT=5432 PGUSER=travellog PGPASSWORD='***' PGDATABASE=travellog \
#     ./scripts/promote-roles.sh --admin Serena --editor some_editor
#
# After promote, affected users must log in again so JWT picks up the new role.
set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-travellog}"
PGPASSWORD="${PGPASSWORD:-travellog}"
PGDATABASE="${PGDATABASE:-travellog}"
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

ADMINS=()
EDITORS=()
DRY_RUN=0
YES=0

usage() {
  sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

split_csv() {
  local raw="$1"
  local IFS=','
  # shellcheck disable=SC2086
  set -- ${raw}
  for part in "$@"; do
    part="$(printf '%s' "$part" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -n "$part" ]] || continue
    printf '%s\n' "$part"
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin)
      [[ $# -ge 2 ]] || { echo "error: --admin needs a value" >&2; usage 1; }
      while IFS= read -r u; do ADMINS+=("$u"); done < <(split_csv "$2")
      shift 2
      ;;
    --editor)
      [[ $# -ge 2 ]] || { echo "error: --editor needs a value" >&2; usage 1; }
      while IFS= read -r u; do EDITORS+=("$u"); done < <(split_csv "$2")
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -y|--yes)
      YES=1
      shift
      ;;
    -h|--help)
      usage 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage 1
      ;;
  esac
done

if [[ ${#ADMINS[@]} -eq 0 && ${#EDITORS[@]} -eq 0 ]]; then
  echo "error: pass at least one of --admin or --editor" >&2
  usage 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql not found. Install PostgreSQL client tools." >&2
  exit 1
fi

sql_quote_list() {
  local first=1
  printf '('
  for u in "$@"; do
    local escaped="${u//\'/\'\'}"
    if [[ $first -eq 1 ]]; then
      first=0
    else
      printf ', '
    fi
    printf "'%s'" "$escaped"
  done
  printf ')'
}

# PostgreSQL text array literal: ARRAY['a','b']::text[]
sql_text_array() {
  local first=1
  printf 'ARRAY['
  for u in "$@"; do
    local escaped="${u//\'/\'\'}"
    if [[ $first -eq 1 ]]; then
      first=0
    else
      printf ', '
    fi
    printf "'%s'" "$escaped"
  done
  printf ']::text[]'
}

echo "Target DB: ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}"
if [[ ${#ADMINS[@]} -gt 0 ]]; then
  echo "  ADMIN  <- ${ADMINS[*]}"
fi
if [[ ${#EDITORS[@]} -gt 0 ]]; then
  echo "  EDITOR <- ${EDITORS[*]}"
fi
if [[ $DRY_RUN -eq 1 ]]; then
  echo "  mode: dry-run (no writes)"
fi
echo

# Confirm when not clearly local
case "$PGHOST" in
  localhost|127.0.0.1|::1) ;;
  *)
    if [[ $YES -ne 1 && $DRY_RUN -ne 1 ]]; then
      read -r -p "Host looks non-local ($PGHOST). Type 'yes' to continue: " confirm
      if [[ "$confirm" != "yes" ]]; then
        echo "Aborted."
        exit 1
      fi
    fi
    ;;
esac

ALL_USERS=("${ADMINS[@]}" "${EDITORS[@]}")
ALL_LIST="$(sql_quote_list "${ALL_USERS[@]}")"

echo "=== before ==="
psql -v ON_ERROR_STOP=1 -c \
  "SELECT id, username, email, role FROM users WHERE username IN ${ALL_LIST} ORDER BY id;"

ALL_ARRAY="$(sql_text_array "${ALL_USERS[@]}")"
MISSING="$(psql -v ON_ERROR_STOP=1 -At -c \
  "SELECT u FROM unnest(${ALL_ARRAY}) AS u
   WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = u);")"
if [[ -n "$MISSING" ]]; then
  echo "error: username(s) not found:" >&2
  printf '%s\n' "$MISSING" >&2
  exit 1
fi

OVERLAP=()
for a in "${ADMINS[@]+"${ADMINS[@]}"}"; do
  for e in "${EDITORS[@]+"${EDITORS[@]}"}"; do
    if [[ "$a" == "$e" ]]; then
      OVERLAP+=("$a")
    fi
  done
done
if [[ ${#OVERLAP[@]} -gt 0 ]]; then
  echo "error: same username in --admin and --editor: ${OVERLAP[*]}" >&2
  exit 1
fi

if [[ $DRY_RUN -eq 1 ]]; then
  echo
  echo "Dry-run only. Re-run without --dry-run to apply."
  exit 0
fi

echo
echo "=== applying ==="
psql -v ON_ERROR_STOP=1 <<SQL
BEGIN;
$(
  if [[ ${#ADMINS[@]} -gt 0 ]]; then
    echo "UPDATE users SET role = 'ADMIN' WHERE username IN $(sql_quote_list "${ADMINS[@]}");"
  fi
  if [[ ${#EDITORS[@]} -gt 0 ]]; then
    echo "UPDATE users SET role = 'EDITOR' WHERE username IN $(sql_quote_list "${EDITORS[@]}");"
  fi
)
COMMIT;
SQL

echo
echo "=== after ==="
psql -v ON_ERROR_STOP=1 -c \
  "SELECT id, username, email, role FROM users WHERE username IN ${ALL_LIST} ORDER BY id;"

echo
echo "Done. Ask affected users to log in again so JWT reflects the new role."
