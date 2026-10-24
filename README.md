# Solana Vote DApp

**[English]** | [简体中文](docs/README/README-zh_cn.md)

> **About this project**
>
> This project is an Anchor-based Solana voting program that models an enterprise voting system, with a companion Next.js frontend prototype.
>
> **This project is for learning and demonstrating on-chain voting only. It is not guaranteed to be secure.**

## 1. Overview

Key features:

- Multi-level permissions for the global administrator, departments, roles, and employees.
- Configurable polls with department and role allowlists and denylists, employee-level requirements, and other fine-grained settings.
- Immutable on-chain records of polls, candidate tallies, and votes.
- A frontend for interacting with the on-chain program.

The project has two main parts:

| Directory             | Description                          |
| --------------------- | ------------------------------------ |
| `programs/vote-dapp/` | Anchor on-chain program (Rust)       |
| `app/`                | Companion Next.js frontend prototype |

## 2. Required versions

- Rust `1.89.0`
- Solana/Agave CLI `4.3.2`
- Anchor CLI `1.2.1`
- npm, Node.js, and Yarn
- Surfpool `1.6.1`

## 3. Deployment guide

[Deployment guide from scratch](docs/tutorial/tutorial-en.md)

## 4. License

There is currently no `LICENSE` file in the repository root. The root `package.json` is still marked as ISC, while the on-chain program and frontend packages do not declare a consistent license. The frontend dependency tree also includes third-party dependencies that restrict redistribution. Do not label the entire project as GPL until these dependencies have been reviewed and addressed. Before reusing or publishing the code, verify the licensing terms for all code, dependencies, and assets, then choose and add an appropriate license.

## 5. Related documentation

- [Anchor documentation](https://www.anchor-lang.com/docs)
- [Solana documentation](https://solana.com/docs)
