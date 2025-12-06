# EtherExtoria

**EtherExtoria** is a Node.js-based wallet generator and transfer orchestrator for Ethereum, designed to work with **Tor** and **Proxychains** for enhanced privacy. Generate multiple wallets, automate transfers, and run everything through Tor for anonymity.
created by **Mohammed Zahid Wadiwale**
* 🌐 [https://www.webaon.com](https://www.webaon.com)

---

## Features

- Generate Ethereum wallets (`wallet.js` … `wallet7.js`)
- Perform batch transfers between wallets (`transfer.js`)
- Full integration with **Tor** and **Proxychains**
- Lightweight CLI menu for easy operation
- Works on Node.js v18.20.4+
- CSV-based wallet storage for portability and easy management

---

## Installation

1. Clone the repository or download the files:

```bash
git clone https://github.com/ZahidServers/EtherExtoria.git
cd ether-extoria
```

2. Install dependencies:

```bash
npm install
```

> Required packages: `ethers`, `chalk`, `csv-writer`

3. Ensure Tor is installed on your system:

```bash
sudo apt install tor
```

---

## Tor Service Commands

Keep Tor running while using EtherExtoria:

```bash
sudo service tor start       # Start Tor
sudo systemctl status tor    # Check Tor status
sudo service tor stop        # Stop Tor
```

---

## Usage

### Launch the Main Menu

```bash
npm start
```

This opens the interactive menu:

1. **Create wallets** – Run `wallet.js` … `wallet7.js` under proxychains.
2. **Transfer** – Run `transfer.js` under proxychains and provide RPC URL.
3. **Exit** – Close EtherExtoria.

---

### Individual Scripts

* **Create wallets**:

```bash
npm run wallet
npm run wallet2
...
npm run wallet7
```

* **Transfer funds**:

```bash
npm run transfer
```

Follow the prompts to enter your RPC URL (e.g., Infura, Alchemy).

---

## Wallet Storage

Wallets are stored as CSV files:

* `wallets.csv`, `wallets2.csv`, etc.
* Columns: `Address`, `Private Key`
* Compatible with `transfer.js` for automated transfers

---

## Notes

* Always keep Tor running when using `proxychains` for privacy.
* Ensure you do not share your CSV wallet files; they contain private keys.
* Use a secure RPC provider (Infura, Alchemy) for transfers.
* Works best on Linux with Node.js v18.x+.

---

## Dependencies

* [ethers](https://www.npmjs.com/package/ethers) – Ethereum library
* [chalk](https://www.npmjs.com/package/chalk) – Terminal string styling
* [csv-writer](https://www.npmjs.com/package/csv-writer) – CSV handling

---

# 👨‍💻 Author

**Developed by:**
#### 👉 **Mohammed Zahid Wadiwale**

* 🌐 Website — [https://www.webaon.com](https://www.webaon.com)
* 💻 GitHub — [https://github.com/ZahidServers](https://github.com/ZahidServers)
* 📰 Blog — [https://blog.webaon.com](https://blog.webaon.com)
* 🎓 Academy — [https://academy.webaon.com](https://academy.webaon.com)

#### Support development by buying:

* Hosting
* Domains
* Websites
* Cybersecurity services
* Courses

---
