# Solana Vote DApp

[English](../../README.md) | **[简体中文]**

> **项目说明**
>
> 本项目是一个使用 Anchor 开发，模拟企业投票场景的 Solana 链上程序。提供配套的 Next.js 前端原型。
> 
> **本项目仅用于学习和演示链上投票流程，不保证安全性。**

## 1. 项目概要

主要特性包括：

- 多级权限配置，全局管理员、部门、职位、员工均有各自的权限配置。
- 投票高度可自定义，允许设置部门/职位黑白名单，员工等级等精细功能。
- 不可篡改：投票、候选人计数及投票记录永久保存在链上。
- 提供易用的前端以便于与链上交互。

本项目包含两个主要部分：

| 目录                  | 说明           |
| --------------------- | -------------- |
| `programs/vote-dapp/` | 链上程序       |
| `app/`                | 配套的前端原型 |


## 2 当前依赖版本

- Rust `1.89.0`。
- Solana/Agave CLI `4.3.2`。
- Anchor CLI `1.2.1`。
- npm + nodejs + yarn。
- Surfpool `1.6.1`。


## 3. 部署教程
[从零开始的部署教程](../tutorial/tutorial-zh_cn.md)

## 4. 许可证

本项目采用 [MIT 许可证](../../LICENSE)。第三方依赖仍遵循各自许可证，详见 [程序依赖声明](../../programs/PROGRAM-THIRD-PARTY-NOTICES.html)和[前端依赖声明](../../app/APP-THIRD-PARTY-NOTICES.html)。


## 5. 相关文档

- [Anchor 文档](https://www.anchor-lang.com/docs)：Anchor 框架文档。
- [Solana 文档](https://solana.com/docs)：Solana 开发文档。
