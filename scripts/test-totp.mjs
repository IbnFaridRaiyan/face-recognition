import assert from 'node:assert/strict';

await import('../public/totp.js');

const referenceSecretBytes = new TextEncoder().encode('12345678901234567890');
const referenceSecret = globalThis.SentinelTotp.encode(referenceSecretBytes);

assert.equal(referenceSecret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
assert.deepEqual(globalThis.SentinelTotp.decode(referenceSecret), referenceSecretBytes);
assert.equal(await globalThis.SentinelTotp.generate(referenceSecret, 1), '287082');
assert.equal(await globalThis.SentinelTotp.generate(referenceSecret, 37037036), '081804');
assert.equal(await globalThis.SentinelTotp.generate(referenceSecret, 37037037), '050471');
assert.equal(await globalThis.SentinelTotp.generate(referenceSecret, 41152263), '005924');

console.log('TOTP RFC 6238 vectors passed');
