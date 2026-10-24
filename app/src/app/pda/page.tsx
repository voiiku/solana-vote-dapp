/**
 * PDA derivation tool
 *
 * Features:
 * 1. Derive on-chain account PDA addresses locally in the browser
 * 2. Show the seeds and derivation logic for each PDA type
 * 3. Copy derived addresses with one click
 * 4. No wallet connection required; calculations run entirely in the frontend
 */
"use client";

import { useState, useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ---- PDA derivation functions ----
import {
  getPollConfigPda,
  getEmployeeConfigPda,
  getDepartmentPda,
  getRolePda,
  getEmployeePda,
  getPollPda,
  getCandidatePda,
  getVoteStubPda,
} from "@/lib/pda";

// ---- Constants ----
import { PROGRAM_ID, SEED_VERSION } from "@/lib/constants";

// Convert the Buffer to a readable string for display
const seedVersionStr = SEED_VERSION.toString();

// ============================================================
// Helper types
// ============================================================

/** PDA derivation result */
interface PdaCalcResult {
  address: string;
  bump: number;
}

// ============================================================
// Helper component: copy button
// ============================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable in some environments; fail silently
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ============================================================
// Helper component: PDA result display
// ============================================================

/**
 * Display the derived PDA (address, bump, and copy button).
 * The bump is explained at the top of the page; only its value is shown here.
 */
function PdaResultDisplay({ result }: { result: PdaCalcResult }) {
  return (
    <div className="bg-gray-800 border border-green-800/60 rounded-lg p-3 mt-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-gray-400 text-sm shrink-0">Address:</span>
        <code className="text-green-400 font-mono text-sm break-all flex-1">
          {result.address}
        </code>
        <CopyButton text={result.address} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">Bump:</span>
        <code className="text-yellow-400 font-mono text-sm">{result.bump}</code>
      </div>
    </div>
  );
}

// ============================================================
// Helper component: visualize the seed structure
// ============================================================

interface SeedItem {
  value: string;
  label: string;
  type: "fixed" | "input";
}

/**
 * Show the PDA seed structure as code. Fixed values are blue; user-provided
 * values are yellow.
 */
function SeedDiagram({ seeds }: { seeds: SeedItem[] }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 font-mono text-xs leading-relaxed overflow-x-auto">
      <div className="text-gray-300">
        findProgramAddressSync(
      </div>
      <div className="ml-4 text-gray-400">[</div>
      {seeds.map((seed, i) => (
        <div key={i} className="ml-8 flex gap-2 flex-wrap">
          <span className={seed.type === "fixed" ? "text-blue-400" : "text-yellow-400"}>
            {seed.value}
            {i < seeds.length - 1 ? "," : ""}
          </span>
          <span className="text-gray-600"> {seed.label}</span>
        </div>
      ))}
      <div className="ml-4 text-gray-400">],</div>
      <div className="ml-4">
        <span className="text-purple-400">PROGRAM_ID</span>
      </div>
      <div className="text-gray-300">)</div>
    </div>
  );
}

// ============================================================
// Helper component: reusable input row
// ============================================================

function InputRow({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

// ============================================================
// PDA section: global configuration (PollConfig + EmployeeConfig)
// ============================================================

function GlobalConfigSection() {
  const pollConfig = useMemo(() => {
    try {
      const [pda, bump] = getPollConfigPda();
      return { address: pda.toBase58(), bump };
    } catch {
      return null;
    }
  }, []);

  const employeeConfig = useMemo(() => {
    try {
      const [pda, bump] = getEmployeeConfigPda();
      return { address: pda.toBase58(), bump };
    } catch {
      return null;
    }
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">PollConfig</h3>
            <Badge color="blue">Global singleton</Badge>
          </div>
          <p className="text-sm text-gray-400">
            Stores the global poll counter (total_polls) and poll creation rules
            (minimum/maximum duration, minimum permission level, and more).
            There is only one PollConfig PDA for the program.
          </p>
          <SeedDiagram
            seeds={[
              { value: '"poll_config"', label: "Seed prefix", type: "fixed" },
              { value: `"${seedVersionStr}"`, label: "SEED_VERSION", type: "fixed" },
            ]}
          />
          {pollConfig && <PdaResultDisplay result={pollConfig} />}
        </div>
      </Card>

      <Card>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">EmployeeConfig</h3>
            <Badge color="blue">Global singleton</Badge>
          </div>
          <p className="text-sm text-gray-400">
            Stores the global employee ID counter (global_employee_id).
            The program uses it to assign the next available ID when creating an employee.
          </p>
          <SeedDiagram
            seeds={[
              { value: '"employee_config"', label: "Seed prefix", type: "fixed" },
              { value: `"${seedVersionStr}"`, label: "SEED_VERSION", type: "fixed" },
            ]}
          />
          {employeeConfig && <PdaResultDisplay result={employeeConfig} />}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// PDA section: department
// ============================================================

function DepartmentPdaSection() {
  const [name, setName] = useState("");
  const [result, setResult] = useState<PdaCalcResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    setError("");
    setResult(null);
    if (!name.trim()) { setError("Enter a department name."); return; }
    try {
      const [pda, bump] = getDepartmentPda(name.trim());
      setResult({ address: pda.toBase58(), bump });
    } catch (e) {
      setError(`Derivation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">Department</h3>
          <Badge color="green">By name</Badge>
        </div>
        <p className="text-sm text-gray-400">
          Each department has a unique PDA derived from its name. The name is
          processed by strToBytes64, and only the first 32 bytes are used as a
          seed, so department names must differ within those first 32 bytes
          (about 10 Chinese characters or 32 ASCII characters).
        </p>
        <SeedDiagram
          seeds={[
            { value: '"department"', label: "Seed prefix", type: "fixed" },
            { value: `"${seedVersionStr}"`, label: "SEED_VERSION", type: "fixed" },
            { value: "strToBytes64(name)[0..32]", label: "Department name, first 32 bytes", type: "input" },
          ]}
        />
        <InputRow
          label="Department name"
          value={name}
          onChange={setName}
          placeholder="e.g. Engineering"
        />
        <Button onClick={calculate}>Derive PDA</Button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {result && <PdaResultDisplay result={result} />}
      </div>
    </Card>
  );
}

// ============================================================
// PDA section: role
// ============================================================

function RolePdaSection() {
  const [roleName, setRoleName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [result, setResult] = useState<PdaCalcResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    setError("");
    setResult(null);
    if (!roleName.trim() || !deptName.trim()) {
      setError("Enter both a role name and a department name.");
      return;
    }
    try {
      const [pda, bump] = getRolePda(roleName.trim(), deptName.trim());
      setResult({ address: pda.toBase58(), bump });
    } catch (e) {
      setError(`Derivation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">Role</h3>
          <Badge color="green">By name and department</Badge>
        </div>
        <p className="text-sm text-gray-400">
          A role belongs to a department, so its seeds include both the role
          name and department name. Different departments can have roles with
          the same name (such as Engineering/Manager and Marketing/Manager)
          because their department names produce different PDAs.
        </p>
        <SeedDiagram
          seeds={[
            { value: '"role"', label: "Seed prefix", type: "fixed" },
            { value: `"${seedVersionStr}"`, label: "SEED_VERSION", type: "fixed" },
            { value: "strToBytes64(roleName)[0..32]", label: "Role name, first 32 bytes", type: "input" },
            { value: "strToBytes64(deptName)[0..32]", label: "Department name, first 32 bytes", type: "input" },
          ]}
        />
        <div className="space-y-2">
          <InputRow label="Role name" value={roleName} onChange={setRoleName} placeholder="e.g. Senior Engineer" />
          <InputRow label="Department name" value={deptName} onChange={setDeptName} placeholder="e.g. Engineering" />
        </div>
        <Button onClick={calculate}>Derive PDA</Button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {result && <PdaResultDisplay result={result} />}
      </div>
    </Card>
  );
}

// ============================================================
// PDA section: employee
// ============================================================

function EmployeePdaSection() {
  const [idStr, setIdStr] = useState("");
  const [result, setResult] = useState<PdaCalcResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    setError("");
    setResult(null);
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id < 0) { setError("Enter a valid employee ID (a non-negative integer)."); return; }
    try {
      const [pda, bump] = getEmployeePda(id);
      setResult({ address: pda.toBase58(), bump });
    } catch (e) {
      setError(`Derivation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">Employee</h3>
          <Badge color="yellow">By ID</Badge>
        </div>
        <p className="text-sm text-gray-400">
          Employees use a globally incrementing employee_id (u64), assigned
          by EmployeeConfig starting at 0. The PDA address remains unchanged
          if the employee changes their name or wallet.
        </p>
        <SeedDiagram
          seeds={[
            { value: '"employee"', label: "Seed prefix", type: "fixed" },
            { value: `"${seedVersionStr}"`, label: "SEED_VERSION", type: "fixed" },
            { value: "u64ToLeBytes(employeeId)", label: "Employee ID, 8-byte little-endian", type: "input" },
          ]}
        />
        <InputRow
          label="Employee ID"
          value={idStr}
          onChange={setIdStr}
          placeholder="e.g. 0"
          type="number"
          hint="Globally incremented, starting at 0"
        />
        <Button onClick={calculate}>Derive PDA</Button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {result && <PdaResultDisplay result={result} />}
      </div>
    </Card>
  );
}

// ============================================================
// PDA section: poll
// ============================================================

function PollPdaSection() {
  const [idStr, setIdStr] = useState("");
  const [result, setResult] = useState<PdaCalcResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    setError("");
    setResult(null);
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id < 0) { setError("Enter a valid poll ID (a non-negative integer)."); return; }
    try {
      const [pda, bump] = getPollPda(id);
      setResult({ address: pda.toBase58(), bump });
    } catch (e) {
      setError(`Derivation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">Poll</h3>
          <Badge color="yellow">By ID</Badge>
        </div>
        <p className="text-sm text-gray-400">
          Polls use globally incremented IDs assigned by PollConfig.total_polls.
          Query PollConfig for the current maximum ID before creating a poll.
        </p>
        <SeedDiagram
          seeds={[
            { value: '"poll"', label: "Seed prefix", type: "fixed" },
            { value: `"${seedVersionStr}"`, label: "SEED_VERSION", type: "fixed" },
            { value: "u64ToLeBytes(pollId)", label: "Poll ID, 8-byte little-endian", type: "input" },
          ]}
        />
        <InputRow
          label="Poll ID"
          value={idStr}
          onChange={setIdStr}
          placeholder="e.g. 0"
          type="number"
          hint="Globally incremented, starting at 0"
        />
        <Button onClick={calculate}>Derive PDA</Button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {result && <PdaResultDisplay result={result} />}
      </div>
    </Card>
  );
}

// ============================================================
// PDA section: candidate
// ============================================================

function CandidatePdaSection() {
  const [pollIdStr, setPollIdStr] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<PdaCalcResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    setError("");
    setResult(null);
    const pollId = parseInt(pollIdStr, 10);
    if (isNaN(pollId) || pollId < 0) { setError("Enter a valid poll ID (a non-negative integer)."); return; }
    if (!name.trim()) { setError("Enter a candidate name."); return; }
    try {
      const [pda, bump] = getCandidatePda(pollId, name.trim());
      setResult({ address: pda.toBase58(), bump });
    } catch (e) {
      setError(`Derivation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">Candidate</h3>
          <Badge color="green">By poll ID and name</Badge>
        </div>
        <p className="text-sm text-gray-400">
          A candidate belongs to a poll, so the seeds include both the poll ID
          and candidate name. Candidate names must be unique within a poll
          (duplicate names produce the same PDA).
        </p>
        <SeedDiagram
          seeds={[
            { value: '"candidate"', label: "Seed prefix", type: "fixed" },
            { value: `"${seedVersionStr}"`, label: "SEED_VERSION", type: "fixed" },
            { value: "u64ToLeBytes(pollId)", label: "Poll ID, 8-byte little-endian", type: "input" },
            { value: "strToBytes64(name)[0..32]", label: "Candidate name, first 32 bytes", type: "input" },
          ]}
        />
        <div className="space-y-2">
          <InputRow label="Poll ID" value={pollIdStr} onChange={setPollIdStr} placeholder="e.g. 0" type="number" />
          <InputRow label="Candidate name" value={name} onChange={setName} placeholder="e.g. Proposal A" />
        </div>
        <Button onClick={calculate}>Derive PDA</Button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {result && <PdaResultDisplay result={result} />}
      </div>
    </Card>
  );
}

// ============================================================
// PDA section: vote stub (VoteStub)
// ============================================================

function VoteStubPdaSection() {
  const [pollIdStr, setPollIdStr] = useState("");
  const [voterStr, setVoterStr] = useState("");
  const [result, setResult] = useState<PdaCalcResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    setError("");
    setResult(null);
    const pollId = parseInt(pollIdStr, 10);
    if (isNaN(pollId) || pollId < 0) { setError("Enter a valid poll ID (a non-negative integer)."); return; }
    if (!voterStr.trim()) { setError("Enter the voter's wallet public key."); return; }
    try {
      const voterPubkey = new PublicKey(voterStr.trim());
      const [pda, bump] = getVoteStubPda(pollId, voterPubkey);
      setResult({ address: pda.toBase58(), bump });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Invalid public key")) {
        setError("Invalid public key format. Check that the address is correctly Base58-encoded.");
      } else {
        setError(`Derivation failed: ${msg}`);
      }
    }
  };

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">VoteStub</h3>
          <Badge color="green">By poll ID and voter</Badge>
        </div>
        <p className="text-sm text-gray-400">
          Records a person's vote for a poll. The seeds include the poll ID and
          voter's public key, ensuring one record per voter per poll. The
          frontend can derive this PDA and check whether it exists to determine
          whether the user has voted.
        </p>
        <SeedDiagram
          seeds={[
            { value: '"vote_stub"', label: "Seed prefix", type: "fixed" },
            { value: `"${seedVersionStr}"`, label: "SEED_VERSION", type: "fixed" },
            { value: "u64ToLeBytes(pollId)", label: "Poll ID, 8-byte little-endian", type: "input" },
            { value: "voter.toBuffer()", label: "Voter public key, 32 bytes", type: "input" },
          ]}
        />
        <div className="space-y-2">
          <InputRow label="Poll ID" value={pollIdStr} onChange={setPollIdStr} placeholder="e.g. 0" type="number" />
          <InputRow
            label="Voter wallet public key"
            value={voterStr}
            onChange={setVoterStr}
            placeholder="e.g. 7yCm6edb..."
            hint="Base58-encoded Solana wallet address"
          />
        </div>
        <Button onClick={calculate}>Derive PDA</Button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {result && <PdaResultDisplay result={result} />}
      </div>
    </Card>
  );
}

// ============================================================
// Main page component
// ============================================================

export default function PdaCalculatorPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ======== Page title ======== */}
      <div>
        <h1 className="text-2xl font-bold">PDA Derivation Tool</h1>
        <p className="text-gray-400 text-sm mt-1">
          Derive on-chain account PDA addresses locally in your browser. No wallet connection required.
        </p>
      </div>

      {/* ======== About PDAs ======== */}
      <Card>
        <div className="p-4 space-y-3 text-sm">
          <h2 className="font-semibold text-base">What is a PDA?</h2>
          <div className="text-gray-400 space-y-2">
            <p>
              <strong className="text-white">PDA（Program Derived Address）</strong>
              is a Solana-specific address derivation mechanism. Regular addresses
              are generated from private keys, while PDAs have no associated
              private key. They are derived from a set of{" "}
              <strong className="text-yellow-400">seeds</strong> and a{" "}
              <strong className="text-purple-400">program ID</strong> through hashing.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-blue-400">Deterministic</strong> — The same seeds and program ID always produce the same PDA</li>
              <li><strong className="text-blue-400">No private key</strong> — No one owns a PDA's private key; only the program can sign for it</li>
              <li><strong className="text-blue-400">Unique</strong> — Different seeds produce different addresses for distinct on-chain data</li>
            </ul>
            <p>
              Seeds consist of a <strong className="text-blue-400">fixed prefix</strong> (account type) +
              <strong className="text-blue-400">version</strong> (upgrade and migration support) +
              <strong className="text-yellow-400">variable values</strong> (IDs, names, public keys, etc.).
            </p>
          </div>

          {/* Explain the bump concept here once */}
          <div className="border-t border-gray-700/50 pt-3 mt-3">
            <h3 className="font-medium text-white mb-1">About the bump</h3>
            <p className="text-gray-400">
              PDA derivation returns a bump value from 0 to 255. It ensures
              that the derived address is off the ed25519 curve (meaning there
              is no corresponding private key). The on-chain program stores the
              bump when creating the account and uses it for later validation.
              Each calculator below displays the bump in its result.
            </p>
          </div>
        </div>
      </Card>

      {/* ======== Program information and SEED_VERSION ======== */}
      <Card>
        <div className="p-4 space-y-2 text-sm">
          <h2 className="font-semibold text-base">Current program configuration</h2>
          <div className="flex items-start gap-2">
            <span className="text-gray-400 shrink-0">Program ID:</span>
            <code className="text-purple-400 font-mono break-all">
              {PROGRAM_ID.toBase58()}
            </code>
            <CopyButton text={PROGRAM_ID.toBase58()} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 shrink-0">SEED_VERSION:</span>
            <code className="text-blue-400 font-mono">&quot;{seedVersionStr}&quot;</code>
            <span className="text-gray-500 text-xs">
              — Included in every PDA seed; changing it during an upgrade generates a new set of PDAs
            </span>
          </div>
        </div>
      </Card>

      {/* ======== Helper function reference ======== */}
      <Card>
        <div className="p-4 space-y-3 text-sm">
          <h2 className="font-semibold text-base">Seed encoding reference</h2>
          <p className="text-gray-500 text-xs">
            Common seed-encoding functions referenced by the calculators:
          </p>

          <div className="space-y-3 text-xs text-gray-400">
            {/* strToBytes64 */}
            <div>
              <code className="text-white font-mono">strToBytes64(s)</code>
              <p className="mt-1 ml-4 text-gray-500">
                Encodes a string as UTF-8 bytes, padding with 0x00 if shorter than
                64 bytes and truncating if longer. PDA seeds usually use only the
                first 32 bytes (matching <code className="text-gray-400">&amp;name[..32]</code>
                on the Rust side). Each Chinese character takes 3 bytes, so about
                10 Chinese characters fill 32 bytes.
              </p>
            </div>

            {/* u64ToLeBytes */}
            <div>
              <code className="text-white font-mono">u64ToLeBytes(n)</code>
              <p className="mt-1 ml-4 text-gray-500">
                Encodes a number as an 8-byte little-endian array.
                For example, 1 → <code>[1,0,0,0,0,0,0,0]</code> and 256 → <code>[0,1,0,0,0,0,0,0]</code>.
              </p>
            </div>

            {/* PublicKey.toBuffer */}
            <div>
              <code className="text-white font-mono">PublicKey.toBuffer()</code>
              <p className="mt-1 ml-4 text-gray-500">
                Decodes a Base58 public key into 32 raw bytes. Used when a public
                key is a seed, such as for VoteStub.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ======== 1. Global configuration PDAs ======== */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Global configuration PDAs
          <span className="text-sm font-normal text-gray-500 ml-2">
            Fixed seeds; derived automatically
          </span>
        </h2>
        <GlobalConfigSection />
      </section>

      {/* ======== 2. Organization PDAs ======== */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Organization PDAs
          <span className="text-sm font-normal text-gray-500 ml-2">
            Derived by name or ID
          </span>
        </h2>
        <div className="space-y-4">
          <DepartmentPdaSection />
          <RolePdaSection />
          <EmployeePdaSection />
        </div>
      </section>

      {/* ======== 3. Poll-related PDAs ======== */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Poll-related PDAs
          <span className="text-sm font-normal text-gray-500 ml-2">
            Derived by ID, name, or public key
          </span>
        </h2>
        <div className="space-y-4">
          <PollPdaSection />
          <CandidatePdaSection />
          <VoteStubPdaSection />
        </div>
      </section>

      {/* ======== Notes ======== */}
      <div className="text-xs text-gray-500 space-y-1 pb-4">
        <p>All derivations run locally in your browser; no network requests are made.</p>
        <p>A PDA address only identifies an expected on-chain location; it may not have been initialized yet (the account may not exist).</p>
        <p>Changing SEED_VERSION during a program upgrade changes all PDA addresses.</p>
      </div>
    </main>
  );
}