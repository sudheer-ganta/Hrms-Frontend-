# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.


---

## HRMS frontend: rules of the road

* **The backend is the only source of business truth.** Attendance status, payroll, CTC breakdown, leave balance and
  dates-off all come from API responses. Do not recompute them here. `lib/attendanceDisplay.ts` only maps a canonical
  status to a label and colour.
* **Business dates are IST.** Use `lib/businessDate.ts` (`istToday`, `istMonth`, `addDays`, ...). Never build a business
  date from `new Date().toISOString()` or the browser's local time.
* **Errors:** every API error is `{ success:false, error:{ code, message, details? } }`. Use `errorMessage(err)` from
  `lib/apiError.ts`.
* **Types** in `src/types/index.ts` mirror the backend DTOs; `npm test` fails if the enums or the payroll DTO drift
  from `../Hrms-Backend` (when it sits next to this repo).

```bash
npm run typecheck   # tsc
npm test            # helper + cross-repo contract tests
npm run build
```
See `../Hrms-Backend/docs/ARCHITECTURE.md` and `docs/RUNBOOK.md`.
