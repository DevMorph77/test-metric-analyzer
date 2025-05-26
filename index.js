#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const recast = require("recast");
const babelParser = require("@babel/parser");
const express = require("express");
const htmlTemplate = require('./lib/html-template');

const parser = {
  parse(source) {
    return babelParser.parse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  },
};

function analyzeFile(filePath, visitedFiles, stats, perFileStats) {
  if (visitedFiles.has(filePath)) return;
  visitedFiles.add(filePath);

  let code;
  try {
    code = fs.readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  let ast;
  try {
    ast = recast.parse(code, { parser });
  } catch {
    return;
  }

  // Initialize stats for this file
  perFileStats[filePath] = perFileStats[filePath] || {
    totalTests: 0,
    totalTestSteps: 0,
  };

  recast.types.visit(ast, {
    visitImportDeclaration(pathNode) {
      const importPath = pathNode.node.source.value;
      if (importPath.startsWith(".")) {
        const dir = path.dirname(filePath);
        const resolvedPath = path.resolve(dir, importPath);
        const candidates = [
          resolvedPath,
          resolvedPath + ".ts",
          resolvedPath + ".js",
          path.join(resolvedPath, "index.ts"),
          path.join(resolvedPath, "index.js"),
        ];

        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            analyzeFile(candidate, visitedFiles, stats, perFileStats);
            break;
          }
        }
      }
      this.traverse(pathNode);
    },

    visitCallExpression(pathNode) {
      const callee = pathNode.node.callee;
      if (callee?.type === "Identifier" && callee.name === "test") {
        stats.totalTests++;
        perFileStats[filePath].totalTests++;
      }
      if (
        callee?.type === "MemberExpression" &&
        callee.object?.name === "test" &&
        callee.property?.name === "step"
      ) {
        stats.totalTestSteps++;
        perFileStats[filePath].totalTestSteps++;
      }
      this.traverse(pathNode);
    },
  });
}

function analyzeSpecFile(entryFilePath) {
  const visitedFiles = new Set();
  const stats = { totalTests: 0, totalTestSteps: 0 };
  const perFileStats = {};

  analyzeFile(entryFilePath, visitedFiles, stats, perFileStats);

  return {
    totalTests: stats.totalTests,
    totalTestSteps: stats.totalTestSteps,
    totalTestCases: stats.totalTestSteps,
    files: perFileStats,
  };
}

function getAllSpecFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllSpecFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".spec.ts") &&
      entry.name !== "examples.spec.ts"
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function analyzeTests(testDir) {
  const outputDir = path.join(process.cwd(), "test-metrics-analyzer");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allSpecFiles = getAllSpecFiles(testDir);
  const allMetrics = {};
  let grandTotalTests = 0;
  let grandTotalSteps = 0;

  allSpecFiles.forEach((filePath) => {
    const suiteName = path
      .relative(testDir, filePath)
      .replace(/\\/g, "/")
      .replace(/\.spec\.ts$/, "");
    const stats = analyzeSpecFile(filePath);
    grandTotalTests += stats.totalTests;
    grandTotalSteps += stats.totalTestSteps;

    // Map file paths in 'files' to relative paths for readability
    const filesRelative = {};
    for (const f in stats.files) {
      filesRelative[path.relative(testDir, f).replace(/\\/g, "/")] = stats.files[f];
    }

    allMetrics[suiteName] = {
      totalTests: stats.totalTests,
      totalTestSteps: stats.totalTestSteps,
      totalTestCases: stats.totalTestCases,
      files: filesRelative,
    };
  });

  allMetrics["_total"] = {
    totalTests: grandTotalTests,
    totalTestSteps: grandTotalSteps,
    totalTestCases: grandTotalSteps,
  };

  const outputJsonPath = path.join(outputDir, "test-metrics.json");
  fs.writeFileSync(outputJsonPath, JSON.stringify(allMetrics, null, 2));

  console.log(`✅ All test metrics written to ${outputJsonPath}`);
}

function analyzeSingleSpec(filePath) {
  const outputDir = path.join(process.cwd(), "test-metrics-analyzer");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const stats = analyzeSpecFile(filePath);
  const suiteName = path.basename(filePath, ".spec.ts");

  const filesRelative = {};
  for (const f in stats.files) {
    filesRelative[path.relative(path.dirname(filePath), f).replace(/\\/g, "/")] = stats.files[f];
  }

  const allMetrics = {
    [suiteName]: {
      totalTests: stats.totalTests,
      totalTestSteps: stats.totalTestSteps,
      totalTestCases: stats.totalTestCases,
      files: filesRelative,
    },
    _total: {
      totalTests: stats.totalTests,
      totalTestSteps: stats.totalTestSteps,
      totalTestCases: stats.totalTestCases,
    },
  };

  const outputJsonPath = path.join(outputDir, "test-metrics.json");
  fs.writeFileSync(outputJsonPath, JSON.stringify(allMetrics, null, 2));
  console.log(`✅ Test metrics for ${suiteName} written to ${outputJsonPath}`);
}

function startServer() {
  const app = express();
  const outputDir = path.join(process.cwd(), "test-metrics-analyzer");
  const jsonPath = path.join(outputDir, "test-metrics.json");

  if (!fs.existsSync(jsonPath)) {
    console.error("❌ test-metrics.json not found. Run the analyzer first.");
    process.exit(1);
  }

  app.use(express.static(path.join(__dirname, "public")));

  app.get("/", (req, res) => {
    res.send(htmlTemplate);
  });

  app.get("/test-metrics.json", (req, res) => {
    res.sendFile(jsonPath);
  });

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server started at http://localhost:${PORT}`);
  });
}

// Entry point
const arg = process.argv[2];

if (arg === "serve") {
  startServer();
} else if (arg && arg.endsWith(".spec.ts")) {
  analyzeSingleSpec(path.resolve(arg));
} else {
  const testDir = arg ? path.resolve(arg) : path.join(process.cwd(), "tests");
  analyzeTests(testDir);
}
