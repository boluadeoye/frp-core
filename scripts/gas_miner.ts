const TARGET_ADDRESS = "0xF039Dc10b1Eb92601d0F76FDF67442dA7aBF51D7";

async function mine() {
    console.log(`[+] INITIATING MULTI-FAUCET GAS REQUEST FOR: ${TARGET_ADDRESS}`);
    
    const endpoints = [
        `https://base.faucetme.pro/api/faucet?address=${TARGET_ADDRESS}`,
        `https://www.basefaucet.com/api/claim?address=${TARGET_ADDRESS}`
    ];

    for (const url of endpoints) {
        try {
            console.log(`[~] Hitting: ${url}`);
            const res = await fetch(url, { method: 'POST' });
            const data = await res.json();
            if (data.success || res.status === 200) {
                console.log(`[!!!] GAS REQUEST SENT VIA ${url}`);
                return;
            }
        } catch (e) {
            continue;
        }
    }
    console.log("[-] All faucets throttled. Proceeding with existing balance.");
}
mine();
