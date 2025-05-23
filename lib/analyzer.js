// lib/analyzer.js
const fs = require("fs");
const path = require("path");
const recast = require("recast");
const babelParser = require("@babel/parser");

// ... your parser and analyze functions here, unchanged ...

function runAnalysis(testDirPath) {
  const testDir = path.resolve(testDirPath);
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

  // Ensure output dir exists
  const outputDir = path.join(process.cwd(), "test-metrics-analyzer");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Write JSON file
  const jsonPath = path.join(outputDir, "test-metrics.json");
  fs.writeFileSync(jsonPath, JSON.stringify(allMetrics, null, 2));

  return { metrics: allMetrics, outputDir, jsonPath };
}

module.exports = { runAnalysis };
