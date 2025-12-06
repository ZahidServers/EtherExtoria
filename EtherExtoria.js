// # !/usr/bin/env node
// EtherExtoria.js
// Main menu for running wallet creation scripts and transfer.js via proxychains
// Place this script in the same folder as wallet.js ... wallet7.js and transfer.js
// Usage: node EtherExtoria.js
// -------------------------------------------------------------
//  EtherExtoria - Tor + Proxychains Launcher
//  BY MOHAMMED ZAHID WADIWALE
//
//  🧭 Basic Tor Service Commands:
//    sudo service tor start       # start Tor service
//    sudo systemctl status tor    # check Tor status
//    sudo service tor stop        # stop Tor service
//
//  ⚠️ Keep Tor running while using proxychains or RPC calls will fail!
// -------------------------------------------------------------


const { spawn } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function banner() {
  console.log(chalk.blueBright("---------------------------------------------------------------"));
  console.log(chalk.green.bold("                    E T H E R - E X T O R I A                    "));
  console.log(chalk.yellow("                   BY MOHAMMED ZAHID WADIWALE                     "));
  console.log(chalk.blueBright("---------------------------------------------------------------\n"));
}

function question(q) {
  return new Promise(resolve => rl.question(q, ans => resolve(ans.trim())));
}

function runWithProxychains(command, args = []) {
  // Spawn proxychains <command> <args...>
  // attach stdio so user sees everything.
  const fullArgs = [command, ...args];
  const proc = spawn("proxychains", fullArgs, { stdio: "inherit" });

  proc.on("error", (err) => {
    console.error("Failed to spawn proxychains:", err.message || err);
  });

  proc.on("exit", (code, sig) => {
    if (sig) {
      console.log(`Process terminated with signal ${sig}`);
    } else {
      console.log(`Process exited with code ${code}`);
    }
    showMenu(); // return to menu after child exits
  });
}

async function chooseWalletScript() {
  console.log("\nAvailable wallet scripts in current folder:");

  // detect wallet*.js files
  const files = fs.readdirSync(process.cwd())
    .filter(f => /^wallets?(\d*)\.js$/.test(f) || /^wallet(\d*)\.js$/.test(f))
    .sort();

  // include wallet.js .. wallet7.js even if naming slightly different
  const desired = [];
  for (let i = 1; i <= 7; i++) {
    const name1 = i === 1 ? "wallet.js" : `wallet${i}.js`;
    if (fs.existsSync(path.join(process.cwd(), name1))) desired.push(name1);
  }
  // fallback: if none of the above found, include any wallet*.js discovered
  if (desired.length === 0 && files.length > 0) {
    files.forEach(f => desired.push(f));
  }

  if (desired.length === 0) {
    console.log("  No wallet scripts found (wallet.js .. wallet7.js). Place them here and try again.");
    return;
  }

  desired.forEach((f, idx) => console.log(`  ${idx + 1}) ${f}`));
  const pick = await question(`Pick a script to run (1-${desired.length}) or 'c' to cancel: `);
  if (pick.toLowerCase() === 'c') return;

  const n = parseInt(pick, 10);
  if (!n || n < 1 || n > desired.length) {
    console.log("Invalid selection.");
    return;
  }

  const script = desired[n - 1];
  console.log(`\nRunning ${script} under proxychains... (press Ctrl-C to stop)\n`);
  // run: proxychains node <script>
  runWithProxychains("node", [script]);
}

async function runTransfer() {
  // check transfer.js exists
  const transferFile = path.join(process.cwd(), "transfer.js");
  if (!fs.existsSync(transferFile)) {
    console.log("transfer.js not found in current directory. Place transfer.js here and try again.");
    return;
  }

  // Ask for RPC URL
  const rpc = await question("Enter RPC URL (e.g. https://mainnet.infura.io/v3/YOUR_KEY): ");
  if (!rpc) {
    console.log("No RPC URL provided; aborting.");
    return;
  }

  // Optional: allow user to optionally pass extra args
  const extra = await question("Any extra args to pass to transfer.js? (leave empty for none): ");

  // Build args: transfer.js expects --rpc "..."
  const args = ["transfer.js", "--rpc", rpc];
  if (extra) {
    // split extra on spaces (simple)
    args.push(...extra.split(" ").filter(Boolean));
  }

  console.log(`\nRunning transfer.js under proxychains with RPC: ${rpc}\n`);
  runWithProxychains("node", args);
}

async function showMenu() {
  banner();
  console.log("Menu:");
  console.log("  1) Create wallets (run one of wallet.js .. wallet7.js under proxychains)");
  console.log("  2) Transfer (run transfer.js under proxychains; provide RPC URL)");
  console.log("  3) Exit");
  const ans = await question("\nChoose an option (1-3): ");
  if (ans === "1") {
    await chooseWalletScript();
  } else if (ans === "2") {
    await runTransfer();
  } else if (ans === "3" || ans.toLowerCase() === "q") {
    console.log("Exiting EtherExtoria.");
    rl.close();
    process.exit(0);
  } else {
    console.log("Invalid choice.");
  }
}

// On SIGINT, exit gracefully
process.on("SIGINT", () => {
  console.log("\nCaught SIGINT — exiting.");
  rl.close();
  process.exit(0);
});

// Start
showMenu();
