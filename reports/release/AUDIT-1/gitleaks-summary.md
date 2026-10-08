# AUDIT-1 — gitleaks over the full history

gitleaks 8.24.3 (`zricethezav/gitleaks:v8.24.3`), `git` mode over every commit (2,895), the
repository mounted read-only. The raw report is not committed: it quotes the matched strings, and a
file of "secret" matches serves nobody once the matches are judged.

| rule | where | commit | verdict |
|---|---|---|---|
| generic-api-key | client/src/modules/raceShortKey.js:40 | 9be74a49 (2026-09-06) | false positive — `SHORT_KEY_ALPHABET`, the 31 characters race keys are drawn from |
| generic-api-key | server/src/auth/users.integration.test.js:233 | 47512eaf (2026-06-14) | false positive — a password made up for one integration test, against a throwaway store |

No credential, token or key from any real system appears anywhere in the history.
