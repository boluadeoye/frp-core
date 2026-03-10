const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'secp256k1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log("\n=== FRP ORACLE PUBLIC KEY (Share this with the world) ===");
console.log(publicKey);
console.log("\n=== FRP ORACLE PRIVATE KEY (Keep this secret in Vercel) ===");
console.log(privateKey);
