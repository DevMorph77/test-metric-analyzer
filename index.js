#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const recast = require("recast");
const babelParser = require("@babel/parser");
const express = require("express");
const htmlTemplate = require("./lib/html-template");

const parser = {
  parse(source) {
    return babelParser.parse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  },
};

function analyzeFile(filePath, visitedFiles, stats) {
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

  const functionImportMap = new Map(); // functionName -> sourceFilePath

  recast.types.visit(ast, {
    visitImportDeclaration(pathNode) {
      const importPath = pathNode.node.source.value;
      if (!importPath.startsWith(".")) {
        this.traverse(pathNode);
        return;
      }

      const dir = path.dirname(filePath);
      const resolvedPath = path.resolve(dir, importPath);
      const candidates = [
        resolvedPath,
        resolvedPath + ".ts",
        resolvedPath + ".js",
        path.join(resolvedPath, "index.ts"),
        path.join(resolvedPath, "index.js"),
      ];

      let actualPath;
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          actualPath = candidate;
          break;
        }
      }

      if (actualPath) {
        for (const specifier of pathNode.node.specifiers) {
          if (
            specifier.type === "ImportDefaultSpecifier" ||
            specifier.type === "ImportSpecifier"
          ) {
            functionImportMap.set(specifier.local.name, actualPath);
          }
        }
        analyzeFile(actualPath, visitedFiles, stats);
      }

      this.traverse(pathNode);
    },

    visitCallExpression(pathNode) {
      const callee = pathNode.node.callee;

      // Count test() and test.step()
      if (callee?.type === "Identifier" && callee.name === "test") {
        stats.totalTests++;
      }
      if (
        callee?.type === "MemberExpression" &&
        callee.object?.name === "test" &&
        callee.property?.name === "step"
      ) {
        stats.totalTestSteps++;
      }

      // Handle function calls like Dashboard(), QC(), etc.
      if (callee?.type === "Identifier") {
        const funcName = callee.name;
        const targetFile = functionImportMap.get(funcName);
        if (targetFile) {
          analyzeFile(targetFile, visitedFiles, stats); // Recursive again!
        }
      }

      this.traverse(pathNode);
    },
  });
}

function analyzeSpecFile(entryFilePath) {
  const visitedFiles = new Set();
  const stats = { totalTests: 0, totalTestSteps: 0 };

  analyzeFile(entryFilePath, visitedFiles, stats);

  return {
    totalTests: stats.totalTests,
    totalTestSteps: stats.totalTestSteps,
    totalTestCases: stats.totalTestSteps,
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
    allMetrics[suiteName] = stats;
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

  const allMetrics = {
    [suiteName]: stats,
    _total: stats,
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
