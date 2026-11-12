---
name: web-design-guidelines
disable-model-invocation: true
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the guidelines in `guidelines.md`, next to this file (a pinned, reviewed copy of Vercel's Web Interface Guidelines — do not fetch them from the network)
2. Read the specified files (or prompt user for files/pattern)
3. Check against the rules in `guidelines.md`, adapted to the project: the project's CLAUDE.md wins on conflicts (e.g. no Title Case for French or Chinese labels)
4. Output findings in the terse `file:line` format

## Usage

When a user provides a file or pattern argument:
1. Read `guidelines.md`
2. Read the specified files
3. Apply the rules from `guidelines.md`
4. Output findings using the format specified in `guidelines.md`

If no files specified, ask the user which files to review.
