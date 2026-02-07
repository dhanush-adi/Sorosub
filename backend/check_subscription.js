#!/usr/bin/env node

/**
 * Check if a subscription already exists
 */

const StellarSdk = require('@stellar/stellar-sdk');

// Configuration
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';
const SOROSUB_CONTRACT_ID = 'CDDVY4S7WECSHRUVTNFIA4372SDTHKCBX6FJGGULZ6BBLTY6WTKGQOSO';

// From the error log
const SUBSCRIBER = 'GBK2RMJOXKPYYCJKUNH5NCMHC4MVOVNDBBER4X4OIXSWP6354XJERSAL';
const PROVIDER = 'GDG3ROUV2QYWK2G2DOQXZZYA57KHXFPFPYYIYJMRKKKPXKRS7G34G3HH'; // Security Guardian

async function checkSubscription() {
    try {
        console.log('🔍 Checking for existing subscription...\n');
        console.log(`Subscriber: ${SUBSCRIBER}`);
        console.log(`Provider:   ${PROVIDER}\n`);

        const server = new StellarSdk.rpc.Server(RPC_URL);
        const contract = new StellarSdk.Contract(SOROSUB_CONTRACT_ID);

        // Get account for simulation
        const account = await server.getAccount(SUBSCRIBER);

        // Build get_subscription call
        const operation = contract.call(
            'get_subscription',
            StellarSdk.nativeToScVal(SUBSCRIBER, { type: 'address' }),
            StellarSdk.nativeToScVal(PROVIDER, { type: 'address' })
        );

        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: '100',
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate
        console.log('📡 Calling get_subscription()...\n');
        const response = await server.simulateTransaction(transaction);

        if (response.result && response.result.retval) {
            // Parse subscription
            const subscriptionMap = response.result.retval.value();
            
            console.log('✅ SUBSCRIPTION EXISTS!\n');
            console.log('Subscription details:');
            
            // Extract fields from the map
            for (const entry of subscriptionMap) {
                const key = entry.key().value().toString();
                const val = entry.val();
                
try {
                    let value;
                    switch(key) {
                        case 'subscriber':
                        case 'merchant':
                        case 'token':
                            value = StellarSdk.Address.fromScVal(val).toString();
                            break;
                        case 'amount':
                            value = val.value().lo().toString() + ' stroops';
                            break;
                        case 'interval':
                        case 'last_payment_time':
                            value = val.value().toString() + ' seconds';
                            break;
                        case 'is_active':
                            value = val.value() ? 'TRUE' : 'FALSE';
                            break;
                        case 'credit_score':
                            value = val.value();
                            break;
                        default:
                            value = 'unknown';
                    }
                    console.log(`  ${key}: ${value}`);
                } catch(e) {
                    console.log(`  ${key}: [parse error]`);
                }
            }
            
            console.log('\n❌ This is why you cannot create a new subscription!');
            console.log('   Cancel the existing subscription first.');
            
        } else {
            console.log('✅ No existing subscription found');
            console.log('   You should be able to create a subscription.');
        }

    } catch (error) {
        if (error.message && error.message.includes('Subscription not found')) {
            console.log('✅ No existing subscription found\n');
            console.log('   You should be able to create a subscription.');
            console.log('   The error may be coming from something else.');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

// Run
checkSubscription();
