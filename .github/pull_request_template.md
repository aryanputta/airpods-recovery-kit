## Problem

What reproducible problem does this change solve?

## Change

What is the smallest behavior change?

## Safety and privacy

- [ ] Sound still requires explicit user action.
- [ ] Existing gain and duration caps are unchanged or justified with tests.
- [ ] No personal device data, local paths, credentials, or environment files are included.
- [ ] The public audit passes.

## Verification

- [ ] `npm test`
- [ ] `python3 -m unittest discover -s tests -p 'test_*.py'`
- [ ] `./scripts/audit-public.sh`
