# AUDIT-1 — GitHub repository settings (read-only, gh api, 2026-10-08 19:57 UTC)

Repository: weudlll-cyber/seasonal-race-claude (public). Every value below was read with `gh api`;
nothing was changed.

| setting | value | call |
|---|---|---|
| visibility | public | `repos/{repo}` |
| merge methods | merge commit only (squash off, rebase off) | `repos/{repo}` |
| delete branch on merge | off | `repos/{repo}` |
| secret scanning | **enabled** | `repos/{repo}` .security_and_analysis |
| secret scanning push protection | **enabled** | same |
| secret scanning, non-provider patterns | disabled | same |
| secret scanning, validity checks | disabled | same |
| Dependabot security updates | **disabled** | same |
| Dependabot vulnerability alerts | **disabled** (HTTP 404 "Vulnerability alerts are disabled") | `repos/{repo}/vulnerability-alerts` |
| private vulnerability reporting | **disabled** | `repos/{repo}/private-vulnerability-reporting` |
| branch protection on master | **none** (HTTP 404 "Branch not protected") | `repos/{repo}/branches/master/protection` |
| rulesets | **none** (`[]`) | `repos/{repo}/rulesets` |
| default workflow token permissions | **read**; cannot approve pull requests | `repos/{repo}/actions/permissions/workflow` |
| allowed actions | all; SHA pinning **not required** | `repos/{repo}/actions/permissions` |
| security policy file | none (no SECURITY.md in the root, .github/ or docs/) | `git ls-files` |
| Dependabot config | none (.github/dependabot.yml absent) | `git ls-files` |
| wiki / projects / issues | on / on / on | `repos/{repo}` |
