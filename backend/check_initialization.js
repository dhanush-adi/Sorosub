#!/usr/bin/env node

/**
 * Check if the SoroSub contract is initialized
 */

const StellarSdk = require('@stellar/stellar-sdk');

// Configuration
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';
const SOROSUB_CONTRACT_ID = 'CDDVY4S7WECSHRUVTNFIA4372SDTHKCBX6FJGGULZ6BBLTY6WTKGQOSO';

// Use any valid address for simulation (doesn't need to be funded for read-only)
const SIMULATION_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

async function checkInitialization() {
    try {
        console.log('🔍 Checking if SoroSub contract is initialized...\n');
        console.log(`Contract ID: ${SOROSUB_CONTRACT_ID}\n`);

        const server = new StellarSdk.rpc.Server(RPC_URL);
        const contract = new StellarSdk.Contract(SOROSUB_CONTRACT_ID);

        // Get a simulation account
        const account = await server.getAccount(SIMULATION_ADDRESS).catch(() => {
            // If account doesn't exist, create a dummy one for simulation
            return new StellarSdk.Account(SIMULATION_ADDRESS, '0');
        });

        // Build is_initialized call
        const operation = contract.call('is_initialized');

        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate (read-only, no signing needed)
        console.log('📡 Calling is_initialized()...');
        const response = await server.simulateTransaction(transaction);

        if (response.result) {
            const isInitialized = response.result.retval.value();
            
            if (isInitialized) {
                console.log('✅ Contract IS initialized\n');
                console.log('   The contract is ready to accept subscriptions.');
            } else {
                console.log('❌ Contract is NOT initialized\n');
                console.log('   You need to initialize the contract first with:');
                console.log('   node backend/initialize_contract.js');
            }
        } else {
            console.log('⚠️  Could not determine initialization status');
            console.log('   Response:', JSON.stringify(response, null, 2));
        }

    } catch (error) {
        console.error('❌ Error checking initialization:', error.message);
        
        if (error.message && error.message.includes('Account not found')) {
            console.log('\n⚠️  Using simulation account, trying alternative method...');
        }
    }
}

// Run
checkInitialization();
