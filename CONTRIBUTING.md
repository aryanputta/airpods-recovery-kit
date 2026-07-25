# Contributing

Thanks for helping make AirPods Recovery Kit safer and easier to use.

## Good contributions

- reproduce a browser, macOS, or accessibility bug,
- improve a diagnosis explanation without promising a repair,
- add a test for an audio or privacy boundary,
- improve support for anonymous battery fields across macOS versions,
- or simplify the recovery flow.

Open an issue before a large change. Small, focused pull requests are easier to
review and safer to release.

## Safety and privacy rules

A contribution must not:

- autoplay sound,
- raise the existing gain or duration caps without evidence and tests,
- bypass explicit output or out-of-ears confirmation,
- print or commit device names, Bluetooth addresses, pairing records, local
  paths, credentials, or environment files,
- claim that audio repairs hardware or guarantees liquid removal,
- or weaken the public audit to make a failing check pass.

Use generic fixtures in tests. Never attach a real Bluetooth diagnostic dump to
an issue or pull request.

## Local checks

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
./scripts/audit-public.sh
```

All checks must pass before opening a pull request.

## Pull requests

Describe:

1. the observed problem,
2. the smallest change that solves it,
3. the safety or privacy boundary affected,
4. and the tests that prove the behavior.

Keep unrelated formatting or refactors out of the same pull request.
