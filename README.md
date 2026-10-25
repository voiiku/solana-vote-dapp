# Solana Vote DApp

**[English]** | [简体中文](/docs/README/README-zh_cn.md)

> **About this project**
>
> This project is a Solana on-chain program developed using Anchor that simulates a corporate voting scenario. It includes a corresponding Next.js frontend prototype.
>
> **This project is for learning and demonstrating on-chain voting only. It is not guaranteed to be secure.**

## 1. Overview

Key features:

- Multi-level permissions for the global administrator, departments, roles, and employees.
- Configurable polls with department and role allowlists and denylists, employee-level requirements, and other fine-grained settings.
- Immutable on-chain records of polls, candidate tallies, and votes.
- A frontend for interacting with the on-chain program.

The project has two main parts:

| Directory             | Description        |
| --------------------- | ------------------ |
| `programs/vote-dapp/` | on-chain program   |
| `app/`                | frontend prototype |

## 2. Required versions

- Rust `1.89.0`
- Solana/Agave CLI `4.3.2`
- Anchor CLI `1.2.1`
- npm, Node.js, and Yarn
- Surfpool `1.6.1`

## 3. Deployment guide

[Deployment guide from scratch](docs/tutorial/tutorial-en.md)

## 4. License

This project is licensed under the [MIT License](LICENSE). Third-party dependencies retain their own licenses; see the [program](programs/PROGRAM-THIRD-PARTY-NOTICES.html) and [frontend](app/APP-THIRD-PARTY-NOTICES.html) notices.

## 5. Related documentation

- [Anchor documentation](https://www.anchor-lang.com/docs)
- [Solana documentation](https://solana.com/docs)
