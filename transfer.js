// transfer.js
// Usage: proxychains4 node transfer.js --rpc "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--rpc" || arg === "-r") {
      args.rpc = argv[++i];
    } else if (arg.startsWith("--rpc=")) {
      args.rpc = arg.split("=")[1];
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const RPC_URL = args.rpc || process.env.RPC_URL;
if (!RPC_URL) {
  console.error("❌ ERROR: RPC URL required! Use --rpc <url> or set RPC_URL env var.");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Simple CSV parser for small simple CSVs with header "Address,Private Key"
function parseCsv(filepath) {
  if (!fs.existsSync(filepath)) return null;
  const txt = fs.readFileSync(filepath, "utf8");
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const addrIdx = headers.findIndex(h => /address/i.test(h));
  const pkIdx = headers.findIndex(h => /private\s*key/i.test(h) || /privkey/i.test(h));
  if (addrIdx === -1 || pkIdx === -1) {
    throw new Error(`CSV ${filepath} missing required headers "Address,Private Key"`);
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    if (!cols[addrIdx] || !cols[pkIdx]) continue;
    rows.push({
      address: cols[addrIdx],
      privateKey: cols[pkIdx]
    });
  }
  return rows;
}

// find wallets files in cwd: wallets.csv, wallets2.csv, wallets3.csv, ...
function discoverWalletFiles() {
  const files = fs.readdirSync(process.cwd()).filter(f => /^wallets(\d*)\.csv$/.test(f));
  // Sort so wallets.csv (no number) comes first, then wallets2.csv, wallets3.csv, ...
  files.sort((a, b) => {
    const ia = a.match(/^wallets(\d*)\.csv$/)[1] || "1"; // treat empty as "1"
    const ib = b.match(/^wallets(\d*)\.csv$/)[1] || "1";
    return Number(ia) - Number(ib);
  });
  return files;
}

function percentForIndex(i) {
  // index 0 -> 25%, index 1 -> 35%, index 2 -> 45%, etc.
  return 25 + i * 10;
}

// helper to wait for tx to be mined with timeout
async function waitTx(txResponse, provider, timeoutMs = 5 * 60 * 1000) {
  const receipt = await txResponse.wait(1); // wait 1 confirmation
  return receipt;
}

(async () => {
  try {
    const files = discoverWalletFiles();
    if (files.length < 2) {
      console.error("Need at least 2 wallets files (e.g. wallets.csv and wallets2.csv). Found:", files);
      process.exit(1);
    }
    console.log("Discovered wallet files:", files.join(", "));

    // Read all files into arrays of {address, privateKey}
    const groups = files.map(f => {
      const v = parseCsv(path.join(process.cwd(), f));
      if (!v) return [];
      return v;
    });

    // For each pair groups[i] -> groups[i+1], perform transfers
    for (let i = 0; i < groups.length - 1; i++) {
      const srcGroup = groups[i];
      const dstGroup = groups[i + 1];
      const pct = percentForIndex(i); // percent to send from each source
      console.log(`\nStage ${i + 1}: ${files[i]} -> ${files[i + 1]}  (sending ${pct}% from each source, split evenly across ${dstGroup.length} destinations)`);

      if (!srcGroup.length) {
        console.warn(`  Source group ${files[i]} has no entries — skipping stage.`);
        continue;
      }
      if (!dstGroup.length) {
        console.warn(`  Destination group ${files[i+1]} has no entries — skipping stage.`);
        continue;
      }

      // For each source account
      for (let s = 0; s < srcGroup.length; s++) {
        const src = srcGroup[s];
        // create signer
        let wallet;
        try {
          wallet = new ethers.Wallet(src.privateKey, provider);
        } catch (err) {
          console.error(`  Invalid private key for source ${src.address} (row ${s+1} in ${files[i]}). Skipping.`);
          continue;
        }
        // fetch balance
        let balance;
        try {
          balance = await provider.getBalance(src.address);
        } catch (err) {
          console.error(`  Failed to fetch balance for ${src.address}:`, err.message);
          continue;
        }
        if (balance === 0n) {
          console.log(`  Source ${src.address} balance 0 — skipping.`);
          continue;
        }
        // compute total amount to send = floor(balance * pct / 100)
        const totalToSend = (balance * BigInt(pct)) / 100n;
        if (totalToSend === 0n) {
          console.log(`  Source ${src.address} totalToSend is 0 (balance too small for ${pct}%). Skipping.`);
          continue;
        }

        const perDest = totalToSend / BigInt(dstGroup.length);
        if (perDest === 0n) {
          console.log(`  Source ${src.address} per-destination amount would be 0 (too small). Skipping.`);
          continue;
        }

        console.log(`  Source ${src.address} balance ${ethers.formatEther(balance)} ETH -> totalToSend ${ethers.formatEther(totalToSend)} ETH (${pct}%), perDest ${ethers.formatEther(perDest)} ETH to each of ${dstGroup.length}`);

        // send to each destination sequentially
        for (let d = 0; d < dstGroup.length; d++) {
          const dst = dstGroup[d];
          // build tx
          try {
            // Estimate gas for simple transfer
            const txRequest = {
              to: dst.address,
              value: perDest
            };
            let estimatedGas;
            try {
              estimatedGas = await provider.estimateGas({
                from: src.address,
                to: dst.address,
                value: perDest
              });
            } catch (e) {
              // estimation can fail; fallback to 21000
              estimatedGas = 21000n;
            }
            const feeData = await provider.getFeeData();
            // fallback values if null
            const maxPriority = feeData.maxPriorityFeePerGas ?? ethers.parseUnits("2", "gwei");
            const maxFee = feeData.maxFeePerGas ?? ethers.parseUnits("50", "gwei");

            // compute gas cost = estimatedGas * maxFee
            const gasCost = estimatedGas * maxFee;
            // Ensure perDest > gasCost (so we don't spend fees bigger than amount)
            if (BigInt(perDest) <= gasCost) {
              console.warn(`    SKIP: perDest ${ethers.formatEther(perDest)} ETH <= estimated gas cost ${ethers.formatEther(gasCost)} ETH. Would be uneconomic.`);
              continue;
            }

            // Compose EIP-1559 tx
            const tx = {
              to: dst.address,
              value: perDest,
              // use maxFee/maxPriority to be safe
              maxPriorityFeePerGas: maxPriority,
              maxFeePerGas: maxFee,
              gasLimit: estimatedGas
            };

            console.log(`    Sending from ${src.address} -> ${dst.address} : ${ethers.formatEther(perDest)} ETH  (gasLimit ${estimatedGas}, maxFee ${ethers.formatEther(maxFee)} ETH)`);
            const sent = await wallet.sendTransaction(tx);
            console.log(`    tx hash: ${sent.hash}  - waiting 1 conf...`);
            const receipt = await waitTx(sent, provider);
            console.log(`    tx mined in block ${receipt.blockNumber} status ${receipt.status}`);
          } catch (err) {
            console.error(`    Error sending to ${dst.address}:`, err.message || err);
            // continue to next dest
          }
        } // end each dest
      } // end each source
    } // end each stage

    console.log("\nAll done.");
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();
