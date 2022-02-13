// https://github.com/mdn/dom-examples/blob/master/web-crypto/

import {ab2str, str2ab} from "./UtilityFunctions";

export default class RsaEncryptFunctions {

  static importPublicKey = async (pem: string): Promise<CryptoKey> => {
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    const binaryDerString = window.atob(pemContents);
    const binaryDer = str2ab(binaryDerString);

    return await window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        true,
        ["encrypt"]
    );
  }

  static importPrivateKey = async (pem: string): Promise<CryptoKey> => {
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    const binaryDerString = window.atob(pemContents);
    const binaryDer = str2ab(binaryDerString);

    return window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        true,
        ["decrypt"]
    );
  }

  static encryptMessage = async (message: string, publicKey: CryptoKey) => {
    const enc = new TextEncoder();
    const encoded = enc.encode(message);

    const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        publicKey,
        encoded
    );

    const encodedAndEncrypted = ab2str(ciphertext);
    return window.btoa(encodedAndEncrypted);
  }

  static decryptMessage = async (message: string, publicKey: CryptoKey) => {
    const enc = new TextEncoder();
    const encoded = enc.encode(message);

    const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        publicKey,
        encoded
    );

    const encodedAndEncrypted = ab2str(ciphertext);
    return window.btoa(encodedAndEncrypted);
  }

  static generateKeyPair = async (): Promise<[string, string]> => {
    const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    if (!keyPair.publicKey || !keyPair.privateKey) {
      throw new Error("generate keypair is failed");
    }

    const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);

    return [
      RsaEncryptFunctions.encodePrivateKey(privateKey),
      RsaEncryptFunctions.encodePublicKey(publicKey)
    ];
  }

  private static encodePublicKey = (publicKey: ArrayBuffer): string => {
    const exportedAsString = ab2str(publicKey);
    const exportedAsBase64 = window.btoa(exportedAsString);
    return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
  }

  private static encodePrivateKey = (privateKey: ArrayBuffer): string => {
    const exportedAsString = ab2str(privateKey);
    const exportedAsBase64 = window.btoa(exportedAsString);
    return `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
  }

}