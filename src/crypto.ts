const algorithm = {
    name: "AES-GCM",
    length: 256,
};

const keyConfig = [algorithm, true, ["encrypt", "decrypt"]] as const;

export async function generateEncryptionKey() {
    const key = await window.crypto.subtle.generateKey(...keyConfig);

    return btoa(
        JSON.stringify(await window.crypto.subtle.exportKey("jwk", key))
    );
}

async function importKey(key: string) {
    return await window.crypto.subtle.importKey(
        "jwk",
        JSON.parse(atob(key)),
        ...keyConfig
    );
}

export async function encrypt(data: string, key: string) {
    const bytes = new TextEncoder().encode(data);

    console.log("encrypt: bytes", bytes.length);

    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    console.log("encrypt: iv", iv);

    const encrypted = await window.crypto.subtle.encrypt(
        { ...algorithm, iv },
        await importKey(key),
        bytes
    );

    console.log("encrypt: encrypted", encrypted.byteLength);

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    console.log(combined.length);
    return combined;
}

export async function decrypt(data: ArrayBufferLike, key: string) {
    const iv = new DataView(data, 0, 12);
    const encrypted = new DataView(data, 12);

    console.log("decrypt: iv, encrypted", iv, encrypted);

    const plain = await window.crypto.subtle.decrypt(
        { ...algorithm, iv },
        await importKey(key),
        encrypted
    );

    console.log("decrypt: plain", plain.byteLength);

    const text = new TextDecoder().decode(plain);
    console.log("decrypt: text", text);

    return text;
}
