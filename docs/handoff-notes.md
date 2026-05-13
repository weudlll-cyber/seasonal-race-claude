# Handoff Notes

## 2026-05-13 - Phased Racing Logic (Soft Launch)

- Branch: claude/phased-racing-logic
- Base: master@47b10ef
- Implemented progressive anti-collision activation after GO via softLaunchFactor.
- Added DevScreen controls:
  - enableSoftLaunch
  - softLaunchDurationSeconds
  - softLaunchRampMode (linear/twoStep)
- Integrated factor into:
  - lateral anti-collision movement scaling
  - speed-brake activation scaling
- Kept drafting logic untouched.
- Full test suite status:
  - Pre: 1728 tests (94 files) passed
  - Post: 1742 tests (95 files) passed
- Detailed report: docs/diagnose/phased-racing-implementation-report.md

Note on localStorage:
- Existing raceBehaviorConfig values in localStorage override new defaults.
- Use DevScreen "Reset All Defaults" to apply fresh defaults when needed.
