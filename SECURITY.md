# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

We support the latest published version of `mcp-data-pipeline-connector` on npm. Update to the latest release before reporting a vulnerability.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by emailing the maintainers directly or using GitHub's private vulnerability reporting feature (Security → Report a vulnerability).

Include as much of the following as possible:

- A description of the vulnerability and its potential impact.
- Steps to reproduce the issue.
- Any proof-of-concept code, if applicable.
- The version of `mcp-data-pipeline-connector` you are using.

You can expect an initial response within **72 hours** and a resolution or status update within **14 days**.

## Security Considerations

`mcp-data-pipeline-connector` executes SQL queries against your data sources. To reduce risk:

- **Credential handling**: Store database credentials and API keys in environment variables, not in the config file committed to source control.
- **Query scope**: Grant the connector the minimum database privileges required (read-only where possible).
- **Network exposure**: The connector runs locally; avoid exposing the MCP server port to untrusted networks.
- **Input validation**: SQL is executed through DuckDB's parameterized query layer; avoid constructing raw SQL strings from untrusted input in custom extensions.
