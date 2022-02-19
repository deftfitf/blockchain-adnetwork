// https://github.com/mdn/dom-examples/blob/master/web-crypto/

import {ab2str, bytesToHexString, hexToBytes, str2ab} from "./UtilityFunctions";

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
    const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        secretKey,
        encoded
    );

    const encodedIv = bytesToHexString(iv);
    const encodedAndEncrypted = ab2str(ciphertext);
    return `${encodedIv}${window.btoa(encodedAndEncrypted)}`;
  }

  static decryptMessage = async (ciphertext: string, secretKey: CryptoKey): Promise<string> => {
    const iv = hexToBytes(ciphertext.substring(0, 24));
    const binaryMessageString = window.atob(ciphertext.substring(24));
    const binaryMessage = str2ab(binaryMessageString);

    let decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        secretKey,
        binaryMessage
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  }

}
