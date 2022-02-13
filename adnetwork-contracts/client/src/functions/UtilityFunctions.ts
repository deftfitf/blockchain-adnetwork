export const isAllowedImageMIMEType: (file: File) => boolean = (file) => {
  const mimeType = file.type.trim().toLowerCase();
  return mimeType === 'image/gif' ||
      mimeType === 'image/png' ||
      mimeType === 'image/jpeg';
};

/*
* Convert  an ArrayBuffer into a string
* from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
export const str2ab = (str: string): ArrayBuffer => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

export const ab2str = (buf: ArrayBuffer): string => {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}

export const bytesToHexString = (arr: Uint8Array): string => {
  return Array.from(arr).map(b => (b & 0xFF).toString(16)).join("");
}

export const hexToBytes = (hexString: string): Uint8Array => {
  const arr = [];
  for (let i = 0, len = hexString.length; i < len; i += 2) {
    arr.push(parseInt(hexString.substring(i, 2), 16));
  }
  return new Uint8Array(arr);
}
