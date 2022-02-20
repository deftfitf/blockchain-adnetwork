// https://github.com/mdn/dom-examples/blob/master/web-crypto/

import {ab2str, str2ab} from "./UtilityFunctions";

export default class AesEncryptFunctions {

  static generateKey = (): string => {
    const randomValue = window.crypto.getRandomValues(new Uint8Array(16));
    const generatedKeyAsString = ab2str(randomValue);
    return window.btoa(generatedKeyAsString);
  }

  static importSecretKey = async (rawKey: string): Promise<CryptoKey> => {
    const binaryKeyString = window.atob(rawKey);
    const binaryKey = str2ab(binaryKeyString);

    return await window.crypto.subtle.importKey(
        "raw",
        binaryKey,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
  }

  static encryptMessage = async (message: string, secretKey: CryptoKey) => {
    const enc = new TextEncoder();
    const encoded = enc.encode(message);

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        secretKey,
        encoded
    ));

    const merged = new Uint8Array(iv.length + ciphertext.length);
    merged.set(iv, 0);
    merged.set(ciphertext, iv.length);

    return window.btoa(ab2str(merged));
  }

  static decryptMessage = async (ciphertext: string, secretKey: CryptoKey): Promise<string> => {
    const binaryMessageString = window.atob(ciphertext);
    const binaryMessage = str2ab(binaryMessageString);

    const iv = new Uint8Array(binaryMessage, 0, 12);
    const ciphertextBytes = new Uint8Array(binaryMessage, 12, binaryMessage.byteLength - 12);

    let decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        secretKey,
        ciphertextBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  }

}
