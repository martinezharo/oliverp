# AGENTS.md

## Project

OlivERP is a basic online ERP for small businesses with a modern UI and UX. This repository is a very early work in progress, so proposing sweeping changes that improve long-term maintainability is encouraged.

## Key Features

- Record sales and purchases easily without accounting knowledge.

## Priorities

- Optimize performance on both the frontend and backend.
- Maintain strong security and privacy without compromising the user experience unnecessarily.

## Maintainability

Long-term maintainability is a core priority. When adding new functionality, first check whether shared logic can be extracted into a separate module. Duplicating logic across multiple files is a code smell and should be avoided. Do not be afraid to change existing code, and do not take shortcuts by adding local logic solely to solve a single problem.
