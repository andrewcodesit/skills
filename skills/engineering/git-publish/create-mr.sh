#!/usr/bin/env bash
# Opens a title-only MR/PR for the current branch, assigned to the authenticated user, and
# verifies the assignment landed. There is deliberately no way to pass a description.
#
# Usage: create-mr.sh "<title>" [--ready]
#   Draft by default; --ready only when the user asked for a ready-for-review MR/PR.
# Prints the MR/PR URL on success. Exits non-zero if creation or assignment fails.
set -euo pipefail

title=${1:?usage: create-mr.sh "<title>" [--ready]}
ready=false
[[ ${2:-} == --ready ]] && ready=true

branch=$(git branch --show-current)
remote=$(git remote get-url origin)

if [[ $remote == *gitlab.com* ]]; then
  path=$(sed -E 's#^(git@gitlab\.com:|https://gitlab\.com/)##; s#\.git$##' <<<"$remote")
  project=$(jq -rn --arg p "$path" '$p|@uri')
  target=$(glab api "projects/$project" | jq -r .default_branch)
  me=$(glab api user | jq -r .id)
  $ready || title="Draft: $title"

  # -f sends strings verbatim; -F would read a value starting with "@" from a local file.
  mr=$(glab api "projects/$project/merge_requests" -X POST \
    -f "source_branch=$branch" \
    -f "target_branch=$target" \
    -f "title=$title" \
    -F "assignee_id=$me")
  iid=$(jq -r .iid <<<"$mr")

  assigned=$(glab api "projects/$project/merge_requests/$iid" | jq --argjson me "$me" '[.assignees[].id] | index($me) != null')
  if [[ $assigned != true ]]; then
    glab api "projects/$project/merge_requests/$iid" -X PUT -F "assignee_id=$me" >/dev/null
    assigned=$(glab api "projects/$project/merge_requests/$iid" | jq --argjson me "$me" '[.assignees[].id] | index($me) != null')
  fi
  [[ $assigned == true ]] || { echo "MR !$iid created but assignment failed" >&2; exit 1; }
  jq -r .web_url <<<"$mr"

elif [[ $remote == *github.com* ]]; then
  repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
  base=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)
  me=$(gh api user --jq .login)

  pr=$(gh api "repos/$repo/pulls" -X POST \
    -f "title=$title" \
    -f "head=$branch" \
    -f "base=$base" \
    -F "draft=$([[ $ready == true ]] && echo false || echo true)")
  number=$(jq -r .number <<<"$pr")

  # The pulls endpoint ignores assignees, so assign through the issues endpoint.
  gh api "repos/$repo/issues/$number/assignees" -X POST -f "assignees[]=$me" >/dev/null
  assigned=$(gh api "repos/$repo/issues/$number" --jq "[.assignees[].login] | index(\"$me\") != null")
  [[ $assigned == true ]] || { echo "PR #$number created but assignment failed" >&2; exit 1; }
  jq -r .html_url <<<"$pr"

else
  echo "Unsupported remote: $remote" >&2
  exit 1
fi
