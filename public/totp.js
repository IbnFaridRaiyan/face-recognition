(() => {
  'use strict';

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function normalise(value) {
    return value.toUpperCase().replace(/[\s=-]/g, '');
  }

  function encode(bytes) {
    let output = '';
    let buffer = 0;
    let bits = 0;

    bytes.forEach((byte) => {
      buffer = (buffer << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += ALPHABET[(buffer >>> (bits - 5)) & 31];
        bits -= 5;
      }
      buffer &= (1 << bits) - 1;
    });

    if (bits > 0) output += ALPHABET[(buffer << (5 - bits)) & 31];
    return output;
  }

  function decode(secret) {
    const cleanSecret = normalise(secret);
    if (!cleanSecret || !/^[A-Z2-7]+$/.test(cleanSecret)) {
      throw new Error('The setup key must use Base32 letters A-Z and digits 2-7.');
    }

    const output = [];
    let buffer = 0;
    let bits = 0;
    for (const character of cleanSecret) {
      buffer = (buffer << 5) | ALPHABET.indexOf(character);
      bits += 5;
      if (bits >= 8) {
        output.push((buffer >>> (bits - 8)) & 255);
        bits -= 8;
        buffer &= (1 << bits) - 1;
      }
    }
    return new Uint8Array(output);
  }

  function createSecret(byteLength = 20) {
    const bytes = new Uint8Array(byteLength);
    globalThis.crypto.getRandomValues(bytes);
    return encode(bytes);
  }

  async function generate(secret, counter, digits = 6) {
    if (!globalThis.crypto?.subtle) throw new Error('This browser does not support secure TOTP generation.');
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      decode(secret),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );

    const counterBuffer = new ArrayBuffer(8);
    const counterBytes = new Uint8Array(counterBuffer);
    let remainingCounter = BigInt(counter);
    for (let index = 7; index >= 0; index -= 1) {
      counterBytes[index] = Number(remainingCounter & 255n);
      remainingCounter >>= 8n;
    }

    const signature = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, counterBuffer));
    const offset = signature[signature.length - 1] & 15;
    const binary = (
      ((signature[offset] & 127) << 24)
      | ((signature[offset + 1] & 255) << 16)
      | ((signature[offset + 2] & 255) << 8)
      | (signature[offset + 3] & 255)
    ) >>> 0;
    return String(binary % (10 ** digits)).padStart(digits, '0');
  }

  globalThis.SentinelTotp = Object.freeze({ createSecret, decode, encode, generate, normalise });
})();
