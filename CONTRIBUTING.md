# Contributing to MCP Data Pipeline Connector

Thank you for your interest in contributing to `mcp-data-pipeline-connector`!

## Getting Started

```bash
git clone https://github.com/<org>/mcp-data-pipeline-connector.git
cd mcp-data-pipeline-connector
npm install
npm test
```

All tests must pass before submitting a pull request.

## Project Layout

```
src/
  connectors/  # Source connectors (csv, postgres, rest) — one file per source type
  query/       # DuckDB query execution and schema introspection
  tools/       # MCP tool handlers
  config/      # Connection config loader and validator
```

Adding a new data source connector? Create a file in `src/connectors/` that implements the `DataConnector` interface and add a matching test file.

## How to Contribute

### Bug Reports

Open a GitHub issue with:

- Steps to reproduce.
- Expected vs. actual behavior.
- Data source type affected.
- Node.js version and OS.

### New Connector Requests

Open an issue describing the data source and your use case before writing code. Include a sample connection config.

### Pull Requests

1. Fork the repository and create a branch from `main`.
2. Write or update tests for any changed behavior.
3. Run `npm test` and ensure all tests pass.
4. Follow the existing code style (run `npm run lint`).
5. Never commit real credentials in tests — use environment variable references or fixture files.
6. Reference the relevant issue in the PR description.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(connectors): add MySQL connector
fix(query): handle NULL values in cross-source joins
docs: add Postgres connection example to README
```

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.
