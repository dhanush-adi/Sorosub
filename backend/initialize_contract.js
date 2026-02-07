#!/usr/bin/env node

/**
 * Initialize the SoroSub contract with admin and liquidity pool addresses
 * Run this ONCE after deploying the contract
 */

const StellarSdk = require('@stellar/stellar-sdk');

// Configuration
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';
const SOROSUB_CONTRACT_ID = 'CDDVY4S7WECSHRUVTNFIA4372SDTHKCBX6FJGGULZ6BBLTY6WTKGQOSO';

// Admin key (you need to provide this)
const ADMIN_SECRET = process.env.ADMIN_SECRET || prompt('Enter admin secret key: ');

async function initializeContract() {
    try {
        console.log('🚀 Initializing SoroSub Contract...\n');

        // Setup
        const server = new StellarSdk.rpc.Server(RPC_URL);
        const adminKeypair = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);
        const adminPublicKey = adminKeypair.publicKey();

        console.log(`Admin Address: ${adminPublicKey}`);
        console.log(`Contract ID: ${SOROSUB_CONTRACT_ID}\n`);

        // For now, use admin as liquidity pool (you can change this later)
        const liquidityPoolAddress = adminPublicKey;

        // Build initialize transaction
        const contract = new StellarSdk.Contract(SOROSUB_CONTRACT_ID);
        const account = await server.getAccount(adminPublicKey);

        const operation = contract.call(
            'initialize',
            StellarSdk.nativeToScVal(adminPublicKey, { type: 'address' }),
            StellarSdk.nativeToScVal(liquidityPoolAddress, { type: 'address' })
        );

        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: '10000',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(operation)
            .setTimeout(300)
            .build();

        // Simulate and prepare
        console.log('🔍 Simulating transaction...');
        const preparedTx = await server.prepareTransaction(transaction);

        // Sign
        console.log('✍️  Signing transaction...');
        preparedTx.sign(adminKeypair);

        // Submit
        console.log('📡 Submitting transaction...');
        const response = await server.sendTransaction(preparedTx);

        if (response.status === 'PENDING') {
            console.log('⏳ Waiting for confirmation...');
            
            let getResponse = await server.getTransaction(response.hash);
            while (getResponse.status === 'NOT_FOUND') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                getResponse = await server.getTransaction(response.hash);
            }

            if (getResponse.status === 'SUCCESS') {
                console.log('\n✅ Contract initialized successfully!');
                console.log(`   Transaction: https://stellar.expert/explorer/testnet/tx/${response.hash}`);
            } else {
                console.log('\n❌ Transaction failed:', getResponse.status);
                console.log('   Result:', JSON.stringify(getResponse, null, 2));
            }
        } else {
            console.log('\n❌ Transaction error:', response.status);
        }

    } catch (error) {
        console.error('\n❌ Error initializing contract:', error);
        if (error.response) {
            console.error('Response:', await error.response.text());
        }
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeContract();
}

module.exports = { initializeContract };
