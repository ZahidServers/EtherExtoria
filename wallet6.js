const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// CSV file path
const csvFilePath = path.join(__dirname, "wallets4.csv");
const fileExists = fs.existsSync(csvFilePath);

// Initialize CSV writer
const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
        {id: "address", title: "Address"},
        {id: "privateKey", title: "Private Key"}
    ],
    append: fileExists
});

// Generate a random wallet
const wallet = ethers.Wallet.createRandom();
const data = [{
    address: wallet.address,
    privateKey: wallet.privateKey
}];

// Write/append to CSV
csvWriter.writeRecords(data)
    .then(() => {
        console.log("Wallet saved!");
        console.log("Address:", wallet.address);
        console.log("Private Key:", wallet.privateKey);
    })
    .catch(err => console.error("Error writing CSV:", err));
