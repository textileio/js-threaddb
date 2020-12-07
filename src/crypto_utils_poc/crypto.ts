import nacl from "tweetnacl";
import { encode, decode } from "@stablelib/utf8";

// @ts-ignore
import Typeson from "typeson";
// @ts-ignore
import builtinTypes from "typeson-registry/dist/presets/builtin";

const tson = new Typeson().register([builtinTypes]);

const testKey = nacl.randomBytes(32);

export interface EncryptedWithId {
  _id: string;
  _mod?: number;
  base64: string;
}

/**
 * encrypt string and return base 64
 */
export function encryptObject(
  object: Record<string, unknown>,
  key?: Uint8Array
): string {
  if (!key) key = testKey;
  const encryptedBytes = encryptWithNacl(key, object);
  return bytesToBase64String(encryptedBytes);
}

/**
 * decrypt string from base 64
 */
export function decryptObject(
  encryptedObjectBase64: string,
  key?: Uint8Array
): Record<string, unknown> {
  if (!key) key = testKey;
  const bytes = base64StringToBytes(encryptedObjectBase64);
  return decryptWithNacl(key, bytes);
}

function bytesToBase64String(input: Uint8Array): string {
  // Binary buffer --> array of 8-bit unsigned ints --> Unicode string -> Base 64 string
  return btoa(String.fromCharCode(...input));
}

/**
 * Converts a base 64 string into a raw binary buffer (ArrayBuffer)
 * For source, see https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
 */
function base64StringToBytes(input: string): Uint8Array {
  return Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
}

function encryptWithNacl(key: Uint8Array, object: any, nonce?: Uint8Array) {
  if (nonce === undefined) {
    nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  }
  const stringified = tson.stringify(object);
  const encrypted = nacl.secretbox(encode(stringified), nonce, key);
  const data = new Uint8Array(nonce.length + encrypted.length);
  data.set(nonce);
  data.set(encrypted, nonce.length);
  return data;
}

function decryptWithNacl(
  encryptionKey: Uint8Array,
  encryptedArray: Uint8Array
) {
  const nonce = encryptedArray.slice(0, nacl.secretbox.nonceLength);
  const message = encryptedArray.slice(
    nacl.secretbox.nonceLength,
    encryptedArray.length
  );
  const rawDecrypted = nacl.secretbox.open(message, nonce, encryptionKey);
  if (rawDecrypted === null) {
    throw new Error("Dexie-encrypted was unable to decrypt an entity.");
  }
  return tson.parse(decode(rawDecrypted));
}
