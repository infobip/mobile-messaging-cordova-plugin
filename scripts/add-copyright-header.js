#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Set your project name here
const PROJECT_NAME = 'MobileMessagingCordova';
const CURRENT_YEAR = new Date().getFullYear();

const exts = [
  '.js',                      // Cordova JS interface
  '.java', '.kt',             // Android
  '.swift', '.m', '.mm', '.h', '.c', '.cpp'   // iOS
];

// Directories to scan (customize as needed)
const sourceDirs = [
  'www',          // Cordova JS interface
  'src/android',  // Android
  'src/ios',      // iOS
  'example',      // Example app
  'tests',         // Tests
];

// Patterns to ignore (from .gitignore)
const ignoredPatterns = [
  'node_modules',
  'plugins',
  'platforms',
  '.idea',
  'test_results',
  'package-lock.json',
  'google-services.json'
];

function makeHeader(fileName) {
  return `//
//  ${fileName}
//  ${PROJECT_NAME}
//
// Copyright (c) 2016-${CURRENT_YEAR} Infobip Limited
// Licensed under the Apache License, Version 2.0
//
`;
}

function hasLicensedUnder(content) {
  return content.toLowerCase().includes('licensed under');
}

function shouldIgnore(filePath) {
  return ignoredPatterns.some(pattern => filePath.includes(pattern));
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (hasLicensedUnder(content)) {
      // Skip files that already have "licensed under"
      return;
    }

    const lines = content.split('\n');
    const fileName = path.basename(filePath);
    const header = makeHeader(fileName).trimEnd();

    // Find the first non-empty line
    let firstNonEmptyIdx = lines.findIndex(line => line.trim() !== '');
    if (firstNonEmptyIdx === -1) firstNonEmptyIdx = 0;
    const firstLine = lines[firstNonEmptyIdx] || '';

    if (firstLine.trim().startsWith('//') && !firstLine.trim().startsWith('///')) {
      // Replace the top block of consecutive // (but not ///) lines and blank lines
      let headerEndIdx = firstNonEmptyIdx;
      for (let i = firstNonEmptyIdx; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if ((trimmed.startsWith('//') && !trimmed.startsWith('///')) || trimmed === '') {
          headerEndIdx = i;
        } else {
          break;
        }
      }
      const newLines = [
        ...lines.slice(0, firstNonEmptyIdx),
        header,
        '', // Ensure a blank line after the header
        ...lines.slice(headerEndIdx + 1)
      ];
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
      console.log(`Header replaced: ${filePath}`);
    } else if (firstLine.trim().startsWith('///')) {
      // Insert header immediately before the first /// line (do not replace)
      const newLines = [
        ...lines.slice(0, firstNonEmptyIdx),
        header,
        '', // Ensure a blank line after the header
        ...lines.slice(firstNonEmptyIdx)
      ];
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
      console.log(`Header inserted before ///: ${filePath}`);
    } else {
      // Add header at the very top
      fs.writeFileSync(filePath, header + '\n\n' + content, 'utf8');
      console.log(`Header added: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return;
  }
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);

    // Skip ignored paths
    if (shouldIgnore(fullPath)) {
      return;
    }

    try {
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (exts.includes(path.extname(fullPath))) {
        processFile(fullPath);
      }
    } catch (err) {
      console.error(`Error accessing ${fullPath}: ${err.message}`);
    }
  });
}

// Run for all source directories
sourceDirs.forEach(dir => walk(dir));