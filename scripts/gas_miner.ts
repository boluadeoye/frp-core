const TARGET = "0xF039Dc10b1Eb92601d0F76FDF67442dA7aBF51D7";
async function mine() {
    console.log(`[+] REQUESTING GAS FROM US-PROXY RELAY FOR: ${TARGET}`);
    try {
        // Hitting the Base Developer Faucet API directly
        const res = await fetch(`https://base.faucetme.pro/api/faucet?address=${TARGET}`, { method: 'POST' });
        const data = await res.json();
        console.log(data.success ? `[!!!] GAS EN ROUTE` : `[-] Relay Throttled: ${data.message}`);
    } catch (e) {
        console.log("[-] Relay Offline. Proceeding to Scout.");
    }
}
mine();
