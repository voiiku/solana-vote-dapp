# Solana Vote DApp Local Deployment Tutorial

This tutorial starts from a fresh development environment and walks through installing the required toolchains, downloading the source, configuring the project, starting a local Surfpool network, deploying the Anchor program, and running the example frontend. Commands target Linux/macOS terminals; Windows users should use WSL2. Unless noted otherwise, run commands from the repository root.

> This project is for learning and local testing only and is not guaranteed to be secure. These steps are for a local Surfpool network only. Do not use a mainnet wallet or real assets. Never commit wallet private keys, seed phrases, or `.env.local`.

## Step 1: Install Rustup

Rustup installs and manages Rust compilers and toolchains. If Rust is not installed, run:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Follow the installer prompts, then reopen your terminal or load the shell environment as instructed. Verify the installation:

```bash
rustup --version
```

## Step 2: Install the required Rust version

The root `rust-toolchain.toml` pins Rust `1.89.0` and enables `rustfmt` and `clippy`. Install the toolchain before downloading the source:

```bash
rustup toolchain install 1.89.0 --profile minimal --component rustfmt --component clippy
rustup toolchain list
```

Once you enter the project directory, Rustup selects this version based on `rust-toolchain.toml`. Verify it:

```bash
rustc --version
cargo --version
rustup show active-toolchain
```

The output should show Rust `1.89.0`. Do not change the toolchain used by this project with `rustup default stable`; `rust-toolchain.toml` selects the project toolchain within the repository.

## Step 3: Install the Solana CLI

The project README specifies Solana/Agave CLI `4.3.2`. Install it with:

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v4.3.2/install)"
```

If the installer asks you to update `PATH`, follow its instructions and reload your shell. Verify the installation:

```bash
solana --version
solana config get
```

The version output should be `4.3.2`. Point the CLI at Surfpool after the local network is running.

## Step 4: Install AVM and the required Anchor CLI version

The on-chain program depends on `anchor-lang = "1.2.1"`, and the project README specifies Anchor CLI `1.2.1`. Use Anchor Version Manager (AVM):

```bash
cargo install --git https://github.com/solana-foundation/anchor avm --locked --force
avm install 1.2.1
avm use 1.2.1
```

Verify the installed version:

```bash
avm --version
anchor --version
```

`anchor --version` should show `1.2.1`. If AVM installation fails, first check that Cargo's binary directory (usually `~/.cargo/bin`) is on `PATH` and that the required Rust toolchain is active.

## Step 5: Install nvm, Node.js, npm, and Yarn

Use nvm to manage Node.js. After installing nvm, reopen the terminal or reload your shell as directed by the installer:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Install the Node.js LTS release (npm is included) and make it the default:

```bash
nvm install --lts
nvm alias default 'lts/*'
node --version
npm --version
```

Install Yarn globally:

```bash
npm install --global yarn
yarn --version
```

The frontend has both `package.json` and `package-lock.json`. The remaining steps use `npm ci` to install from the lockfile; do not use Yarn to rewrite the dependency lockfile unless you intentionally update and review it.

## Step 6: Download the source

Clone the repository with Git:

```bash
git clone https://github.com/voiiku/solana-vote-dapp.git
cd solana-vote-dapp
```

## Step 7: Configure this local deployment

The repository no longer contains a prefilled project program ID or administrator public key. The Rust `declare_id!`, administrator constant, and frontend IDL program-address field are blank. Do not run `cargo build`, `anchor build`, or start the frontend until this step is complete. Generate a local program deployment keypair and administrator wallet, then configure their public keys in the project.

### 7.1 Create a wallet for local testing

Check whether the default Solana CLI wallet already exists:

```bash
solana address
```

If it does not exist, create a local testing wallet:

```bash
mkdir -p ~/.config/solana
solana-keygen new --outfile ~/.config/solana/id.json
```

Read and note its public key:

```bash
solana address --keypair ~/.config/solana/id.json
```

The `id.json` file contains the private key. Keep it on your machine; do not copy it into the repository or commit it.

### 7.2 Generate and synchronize the program ID

The program ID must be the public key of the program deployment keypair. Each local checkout should use its own keypair; do not copy a program ID from this tutorial, another developer's environment, or old build output. Generate a keypair for local testing and let Anchor update the Rust `declare_id!`:

If this keypair file does not exist, generate one:
```bash
mkdir -p target/deploy
solana-keygen new --no-bip39-passphrase --outfile target/deploy/solana_vote_dapp-keypair.json
```

If the keypair already exists and you created it for local testing, do not run the generation command above, as that could overwrite it. After generating or verifying the keypair file, synchronize and display the program public key:

```bash
anchor keys sync
anchor keys list
```

Get the `solana_vote_dapp` public key from `anchor keys list` and add it to the `[programs.localnet]` section in `Anchor.toml`, for example:

```toml
[programs.localnet]
solana_vote_dapp = "<the newly generated program public key>"
```

The current `Anchor.toml` has no prefilled program entry, so add one manually. `anchor keys sync` synchronizes the Rust declaration and also updates an Anchor configuration entry if one already exists, but it does not update the frontend IDL. Enter the public key here, never the keypair file contents. The keypair under `target/` is for local testing only; do not commit it or use it on Mainnet.

### 7.3 Set the administrator address

Set `ADMIN_PUBKEY` in `programs/solana-vote-dapp/src/constants.rs` to the public key of the wallet created in this step:

```rust
pub const ADMIN_PUBKEY: Pubkey = pubkey!("local testing administrator wallet public key");
```

Replace the example text with the actual base58 public key. The `[provider]` wallet in `Anchor.toml` defaults to `~/.config/solana/id.json`. Ensure it is the same local administrator wallet. `ADMIN_PUBKEY` is a public key; do not enter the `id.json` contents, seed phrase, or private key.

### 7.4 Configure frontend environment variables

Create `app/.env.local` and set the program ID and administrator public key generated above:

```dotenv
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8900
NEXT_PUBLIC_PROGRAM_ID=<newly generated program public key>
NEXT_PUBLIC_ADMIN_PUBKEY=<local testing administrator wallet public key>
NEXT_PUBLIC_SOLANA_NETWORK=localnet
```

`NEXT_PUBLIC_` variables are included in browser code. Only put public addresses and the local RPC endpoint in this file; never put secrets or private keys here.

### 7.5 Build the program and sync the frontend IDL

After configuring the Rust source, Anchor settings, and environment variables above, build the program from the repository root:

```bash
anchor build
```

Copy the IDL and generated TypeScript types from this build into the frontend. This makes the frontend IDL use the program address generated for this local checkout instead of a prefilled address:

```bash
cp target/idl/solana_vote_dapp.json app/src/idl/solana_vote_dapp.json
cp target/types/solana_vote_dapp.ts app/src/idl/solana_vote_dapp.ts
```

Any System Program addresses in the IDL are fixed identifiers for Solana protocol accounts, not this project's program ID or administrator public key. Keep the generated IDL content intact.

## Step 8: Install and start the local Surfpool network

Install Surfpool using its official installer (Linux/macOS):

```bash
curl -sL https://run.surfpool.run/ | bash
```

Reopen your terminal after installation and verify the command is available:

```bash
surfpool --version
```

In terminal 1, change to a directory outside the repository before starting Surfpool, and keep it running. This avoids Surfpool automatically trying to deploy the program when started from an Anchor project directory:

```bash
cd ~
surfpool start
```

Surfpool's default RPC endpoint is `http://127.0.0.1:8899`, and its WebSocket endpoint is `ws://127.0.0.1:8900`. In terminal 2, point the Solana CLI at the local network and verify the connection:

```bash
cd solana-vote-dapp
solana config set --url http://127.0.0.1:8899
solana config set --keypair ~/.config/solana/id.json
solana cluster-version
```

`Anchor.toml` sets `skip_local_validator = true`, so do not expect `anchor test` to start the local network. This tutorial runs Surfpool separately.

## Step 9: Deploy the program to Surfpool

In terminal 2, while Surfpool is still running in terminal 1, request test SOL for the local wallet and deploy the program. The program was built in Step 7:

```bash
solana airdrop 10
anchor deploy --provider.cluster localnet
```

Check the deployment:

```bash
solana program show <locally generated program ID>
```

If deployment or Anchor reports a program ID/keypair mismatch, return to Step 7 and verify `target/deploy/solana_vote_dapp-keypair.json`, `declare_id!`, and `Anchor.toml`. Do not ignore the error and continue to the frontend.

## Step 10: Start the example frontend

Keep Surfpool running. In terminal 3, install the frontend dependencies from the npm lockfile and start the development server:

```bash
cd solana-vote-dapp/app
npm ci
npm run dev
```

Open the local URL printed in the terminal (usually `http://localhost:3000`). Connect your local testing wallet and make sure the wallet is set to the local development network. If the program or administrator address changes, update `app/.env.local` and restart the Next.js development server.

Stop the local environment by pressing `Ctrl+C` in the terminals running Next.js and Surfpool. This deployment exists only on the local Surfpool network; it is not deployed to Devnet or Mainnet.
