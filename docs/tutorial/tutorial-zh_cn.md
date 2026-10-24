# Solana Vote DApp 本地部署教程

本文从空白开发环境开始，介绍如何安装项目指定版本的工具链、下载源码、配置项目、启动 Surfpool 本地链、部署 Anchor 程序并运行示例前端。命令适用于 Linux/macOS 终端；Windows 用户请在 WSL2 中操作。除特别说明外，命令均在仓库根目录执行。

> 本项目用于学习和本地测试，不保证安全性。以下步骤仅用于本地 Surfpool，不要用主网钱包或真实资产。绝不提交钱包私钥、助记词或 `.env.local`。

## 第一步：安装 Rustup

Rustup 用于安装和管理 Rust 编译器及工具链。若尚未安装 Rust，在终端执行：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

按安装程序提示完成安装，然后重新打开终端，或按提示加载 shell 环境。确认命令可用：

```bash
rustup --version
```

## 第二步：安装项目指定的 Rust 版本

本项目在根目录的 `rust-toolchain.toml` 中固定 Rust `1.89.0`，并启用 `rustfmt`、`clippy`。在下载源码前可先安装指定工具链：

```bash
rustup toolchain install 1.89.0 --profile minimal --component rustfmt --component clippy
rustup toolchain list
```

进入项目目录后，Rustup 会根据 `rust-toolchain.toml` 自动选择该版本。确认版本：

```bash
rustc --version
cargo --version
rustup show active-toolchain
```

输出应显示 Rust `1.89.0`。不要在项目目录运行 `rustup default stable` 来替换此版本；`rust-toolchain.toml` 会为当前仓库选择项目工具链。

## 第三步：安装 Solana CLI

本项目 README 记录的 Solana/Agave CLI 版本为 `4.3.2`。安装该版本：

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v4.3.2/install)"
```

如果安装程序提示需要更新 `PATH`，按其说明将 Solana 安装目录加入 shell 配置并重新加载终端。检查安装结果：

```bash
solana --version
solana config get
```

版本输出应为 `4.3.2`。本地网络启动后再把 CLI 的 RPC 地址切换到 Surfpool。

## 第四步：安装 AVM，并安装指定版本的 Anchor CLI

链上程序依赖 `anchor-lang = "1.2.1"`，项目 README 指定 Anchor CLI `1.2.1`。使用 Anchor Version Manager（AVM）管理 CLI：

```bash
cargo install --git https://github.com/solana-foundation/anchor avm --locked --force
avm install 1.2.1
avm use 1.2.1
```

确认版本：

```bash
avm --version
anchor --version
```

`anchor --version` 应显示 `1.2.1`。如果 AVM 安装失败，先确认当前 shell 的 `PATH` 包含 Cargo 可执行文件目录（通常为 `~/.cargo/bin`），并确认前述 Rust 工具链已生效。

## 第五步：安装 nvm、Node.js、npm 和 Yarn

使用 nvm 管理 Node.js。安装 nvm 后重开终端，或按安装脚本提示重新加载 shell：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

安装 Node.js LTS（npm 随 Node.js 一同安装），并将该 LTS 设为默认版本：

```bash
nvm install --lts
nvm alias default 'lts/*'
node --version
npm --version
```

全局安装 Yarn：

```bash
npm install --global yarn
yarn --version
```

前端目录同时提供 `package-lock.json` 和 `package.json`。本教程后续使用 `npm ci` 按 lockfile 安装依赖；不要在没有更新并审核 lockfile 的情况下混用 Yarn 来改写依赖锁定文件。

## 第六步：下载源码到本地

使用 Git 克隆源码：

```bash
git clone https://github.com/voiiku/solana-vote-dapp.git
cd solana-vote-dapp
```

## 第七步：修改本地部署所需的配置

仓库不再预填项目程序 ID 或管理员公钥。源码中的 `declare_id!`、管理员常量及前端 IDL 的程序地址字段均为空，因此完成本步骤前不要运行 `cargo build`、`anchor build` 或启动前端。你将在本地生成程序部署密钥和管理员钱包，再把对应的**公钥**配置到项目中。

### 7.1 创建仅用于本地测试的钱包

检查 Solana CLI 默认钱包是否已存在：

```bash
solana address
```

若尚无钱包，创建一个本地测试钱包：

```bash
mkdir -p ~/.config/solana
solana-keygen new --outfile ~/.config/solana/id.json
```

读取并记下该钱包公钥，稍后作为程序管理员和前端管理员：

```bash
solana address --keypair ~/.config/solana/id.json
```

`id.json` 是私钥文件，只保存在本机，不要复制到仓库或提交。

### 7.2 生成并同步程序 ID

程序 ID 必须是部署密钥对的公钥。每个本地 checkout 使用自己的密钥对；不要从教程、他人的环境或旧构建产物复制程序 ID。生成仅用于本地测试的程序密钥对，并让 Anchor 根据密钥对更新 Rust 的 `declare_id!`：

若该文件不存在，生成新密钥对：
```bash
mkdir -p target/deploy
solana-keygen new --no-bip39-passphrase --outfile target/deploy/solana_vote_dapp-keypair.json
```

如果该密钥文件已经存在且是你创建的本地测试密钥，不要执行上面的生成命令，以免覆盖它。生成或确认密钥文件后，再同步并查看程序公钥：

```bash
anchor keys sync
anchor keys list
```

从 `anchor keys list` 读取 `solana_vote_dapp` 的公钥，并将它填入 `Anchor.toml` 的 `[programs.localnet]` 项，例如 `solana_vote_dapp = "<刚生成的程序公钥>"`。当前 `Anchor.toml` 没有预填程序条目，所以需要手动添加；`anchor keys sync` 会同步 Rust 声明，若配置中已有程序条目也会一并同步，但不会更新前端 IDL。此处不要填写密钥文件内容。`target/` 下的密钥对只用于本地测试，勿提交或用于主网。

### 7.3 设置管理员地址

将本步骤创建的钱包公钥填写到 `programs/solana-vote-dapp/src/constants.rs` 的 `ADMIN_PUBKEY`：

```rust
pub const ADMIN_PUBKEY: Pubkey = pubkey!("本地测试管理员钱包公钥");
```

将示例字符串替换为实际 base58 公钥，并移除引号中的说明文字。`Anchor.toml` 的 `[provider]` 钱包默认为 `~/.config/solana/id.json`。确保它就是对应的本地测试管理员钱包。`ADMIN_PUBKEY` 是公钥，不要填入 `id.json` 内容、助记词或私钥。

### 7.4 设置前端本地环境变量

在 `app/` 下创建 `.env.local`，将程序 ID 和管理员公钥填写为刚生成的值：

```dotenv
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8900
NEXT_PUBLIC_PROGRAM_ID=<本地生成的程序公钥>
NEXT_PUBLIC_ADMIN_PUBKEY=<本地测试管理员钱包公钥>
NEXT_PUBLIC_SOLANA_NETWORK=localnet
```

`NEXT_PUBLIC_` 变量会进入前端浏览器代码，只能填写公开地址和本地 RPC，不要填写私钥或助记词。

### 7.5 先完成链上构建，再同步前端 IDL

配置好上述 Rust、Anchor 和环境变量后，在仓库根目录运行：

```bash
anchor build
```

将本次构建生成的 IDL 及 TypeScript 类型文件复制到前端。这样前端 IDL 中的程序地址来自本地构建，不需要手动复用任何预填地址：

```bash
cp target/idl/solana_vote_dapp.json app/src/idl/solana_vote_dapp.json
cp target/types/solana_vote_dapp.ts app/src/idl/solana_vote_dapp.ts
```

IDL 中如有 System Program 地址，属于 Solana 协议账户的固定标识，不是本项目的程序 ID 或管理员公钥；应保留由 Anchor 生成的内容。

## 第八步：安装并启动 Surfpool 本地链

Surfpool 官方安装方式如下（适用于 Linux/macOS）：

```bash
curl -sL https://run.surfpool.run/ | bash
```

安装完成后重开终端，确认 Surfpool 命令可用：

```bash
surfpool --version
```

在终端一切换到仓库目录之外，再启动 Surfpool 并保持该终端运行。避免在 Anchor 项目目录中启动，以免 Surfpool 自动尝试部署程序：

```bash
cd ~
surfpool start
```

Surfpool 默认 RPC 为 `http://127.0.0.1:8899`，WebSocket 为 `ws://127.0.0.1:8900`。另开终端二，切换 Solana CLI 到本地网络并确认连接：

```bash
cd solana-vote-dapp
solana config set --url http://127.0.0.1:8899
solana config set --keypair ~/.config/solana/id.json
solana cluster-version
```

`Anchor.toml` 设置了 `skip_local_validator = true`，因此不要依赖 `anchor test` 自动启动本地链；本教程由 Surfpool 单独运行。

## 第九步：将程序部署到 Surfpool

在终端二（确保终端一里的 Surfpool 仍在运行）为本地测试钱包领取测试 SOL，然后部署程序。程序已在第七步构建：

```bash
solana airdrop 10
anchor deploy --provider.cluster localnet
```

检查部署结果：

```bash
solana program show <本地部署程序ID>
```

如果部署或 Anchor 报程序 ID/密钥对不一致，返回第七步核对 `target/deploy/solana_vote_dapp-keypair.json`、`declare_id!` 与 `Anchor.toml`；不要忽略错误继续启动前端。

## 第十步：启动示例前端

保持 Surfpool 运行，在终端三进入前端目录并按 npm lockfile 安装依赖：

```bash
cd solana-vote-dapp/app
npm ci
npm run dev
```

打开终端输出的本地地址（通常为 `http://localhost:3000`）。在页面连接本地测试钱包，并确认钱包使用的是本地开发网络。若程序地址或管理员地址有变化，同步更新 `app/.env.local` 后重启 Next.js 开发服务器。

停止本地环境时，分别在运行 Next.js 和 Surfpool 的终端按 `Ctrl+C`。此部署只存在于 Surfpool 本地链，不会部署到 Devnet 或 Mainnet。
