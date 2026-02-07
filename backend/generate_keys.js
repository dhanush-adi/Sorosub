
const { Keypair } = require('@stellar/stellar-sdk');

console.log('Generating valid testnet addresses...');
for (let i = 0; i < 8; i++) {
    const pair = Keypair.random();
    console.log(`Provider ${i + 1}: ${pair.publicKey()}`);
}
