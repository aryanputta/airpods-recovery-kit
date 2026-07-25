#!/bin/zsh

set -euo pipefail

REPO_DIR="${0:A:h:h}"

cd "$REPO_DIR"

private_pattern='(/Users/|/home/[^/]+|gho_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2})'

if rg --hidden -n -i "$private_pattern" . \
  -g '!.git/**' \
  -g '!graphify-out/**' \
  -g '!scripts/audit-public.sh'; then
  print -u2 "Privacy audit failed: possible private identifier or credential."
  exit 1
fi

if rg --hidden --files . -g '!.git/**' -g '!graphify-out/**' | \
  rg '(^|/)(\.env($|\.)|.*\.plist$|.*\.mobileconfig$|id_rsa|id_ed25519|credentials|secrets?\.)'; then
  print -u2 "Privacy audit failed: sensitive filename detected."
  exit 1
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  revisions=("${(@f)$(git rev-list --all)}")
  if (( ${#revisions} > 0 )) && git grep -l -I -E "$private_pattern" \
    "${revisions[@]}" -- . ':(exclude)scripts/audit-public.sh'; then
    print -u2 "Privacy audit failed: private data found in Git history."
    exit 1
  fi
  if git log --all --name-only --format= | \
    rg -i '(^|/)(\.env($|\.)|.*\.plist$|.*\.mobileconfig$|id_rsa|id_ed25519|credentials|secrets?\.)'; then
    print -u2 "Privacy audit failed: sensitive filename found in Git history."
    exit 1
  fi
fi

npm test
python3 -m unittest discover -s tests -p 'test_*.py'
zsh -n skills/recover-airpods-audio/scripts/airpods-recovery.sh
node --check site/app.js
node --check site/audio-engine.js
node --check site/safety.js
python3 -m py_compile \
  skills/recover-airpods-audio/scripts/battery_check.py \
  skills/recover-airpods-audio/scripts/generate_audio.py

skill_validator="${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py"
if [[ -f "$skill_validator" ]]; then
  python3 "$skill_validator" skills/recover-airpods-audio
fi

print "Public audit passed."
