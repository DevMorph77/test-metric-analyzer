# test-metrics-analyzer

> A CLI tool to analyze Playwright `.spec.ts` test files and generate test metrics — including total tests, steps, and cases. Also includes a live dashboard viewer.

---

## Features

- Analyze a single spec file or a full test directory
- Count total `test()` and `test.step()` calls
- Recursively resolves and analyzes imports
- Excludes files like `examples.spec.ts` by default
- Outputs structured metrics as JSON
- Optional live HTML dashboard viewer (`serve` mode)

---

## Installation

Use it directly without installing:

```bash
npx test-metrics-analyzer
```

Or install globally:

```bash
npm install -g test-metrics-analyzer
```

---

## Usage

### Analyze an entire test folder

```bash
npx test-metrics-analyzer tests
```

Analyzes all `.spec.ts` files (excluding `examples.spec.ts`) under the `tests` directory.

---

### Analyze a single spec file

```bash
npx test-metrics-analyzer tests/auth/login.spec.ts
```

Analyzes only the provided file (with import tracing).

---

### Start the metrics dashboard server

```bash
npx test-metrics-analyzer serve
```

Starts a local Express server at:  
[http://localhost:3000](http://localhost:3000)

The server loads metrics from the previously generated `test-metrics-analyzer/test-metrics.json` file.

---

## Output

A new folder will be created:

```
test-metrics-analyzer/
└── test-metrics.json
```

### Example `test-metrics.json`:

```json
{
  "auth/login": {
    "totalTests": 3,
    "totalTestSteps": 5,
    "totalTestCases": 5
  },
  "dashboard/home": {
    "totalTests": 4,
    "totalTestSteps": 8,
    "totalTestCases": 8
  },
  "_total": {
    "totalTests": 7,
    "totalTestSteps": 13,
    "totalTestCases": 13
  }
}
```

---

## CLI Options

| Command / Argument | Description                              |
|--------------------|------------------------------------------|
| `[path]`           | Directory or file path to analyze        |
| `serve`            | Launches a local dashboard server        |
| *(none)*           | Defaults to analyzing `./tests` folder   |

---

## License

MIT

---

## Author

**Morpheus77**  

GitHub: [https://github.com/DevMorph77]