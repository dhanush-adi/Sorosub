// SoroSub Contract Configuration
// Auto-generated after deployment to Stellar Testnet

export const SOROSUB_CONFIG = {
    // Contract ID on Stellar Testnet
    CONTRACT_ID: "CC72ORKR3TVSIZ7TOFMNTKPJJ77IL6NMQAWBWQBIBRNIHEJARBWZRBQJ",

    // Network configuration
    NETWORK: "testnet",
    NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    RPC_URL: "https://soroban-testnet.stellar.org",

    // Admin/Deployer address
    ADMIN_ADDRESS: "GDFYJUIWYT63JQW4YCIMJTHOTHRE4W4OAUUO6JZB3PDGCQZBQGUAOJHX",

    // Liquidity Pool address (for BNPL)
    LIQUIDITY_POOL: "GDFYJUIWYT63JQW4YCIMJTHOTHRE4W4OAUUO6JZB3PDGCQZBQGUAOJHX",

    // Explorer links
    EXPLORER_TX: "https://stellar.expert/explorer/testnet/tx/d748071f16088534af331c4a8a895bd75afe58089aaf7fa721d8a0ac39db220a",
    EXPLORER_CONTRACT: "https://stellar.expert/explorer/testnet/contract/CC72ORKR3TVSIZ7TOFMNTKPJJ77IL6NMQAWBWQBIBRNIHEJARBWZRBQJ",

    // Deployed: 2026-02-07
} as const;

export type SorosubConfig = typeof SOROSUB_CONFIG;
