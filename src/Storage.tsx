import { BlobServiceClient } from "@azure/storage-blob";
import React, { createContext, useContext, useState } from "react";
import { decrypt, encrypt, generateEncryptionKey } from "./crypto";
import { useLocalStorageState } from "./hooks/useLocalStorageState";

export interface StoragePayload {
    version: string;
    data: object | undefined;
}

export interface StorageConfig {
    encryptionKey: string;
    blobConnectionString: string;
    load(): Promise<StoragePayload>;
    save(data: StoragePayload): Promise<string>;
}

function getBlob(url: string) {
    const client = new BlobServiceClient(url);
    const container = client.getContainerClient("data");
    return container.getBlockBlobClient("spendy");
}

const StorageContext = createContext<StorageConfig>({
    encryptionKey: "",
    blobConnectionString: "",
    load: () => Promise.resolve({ data: {}, version: "" }),
    save: () => Promise.resolve(""),
});

export function useStorage() {
    return useContext(StorageContext);
}

export interface StorageProps {}

export function Storage({ children }: React.PropsWithChildren<StorageProps>) {
    const [key, setKey] = useLocalStorageState("spendy-key");
    const [con, setCon] = useLocalStorageState("spendy-con");
    const [editingCon, setEditingCon] = useState(con);
    const [showConfig, setShowConfig] = useState(false);

    async function onClickGenerateKey() {
        setKey(await generateEncryptionKey());
    }

    const ctx: StorageConfig = {
        encryptionKey: key,
        blobConnectionString: con,
        async load() {
            const fetchedBlob = await getBlob(con).download();
            const version = fetchedBlob.etag!;
            let data: object | undefined = undefined;
            try {
                const body = await fetchedBlob.blobBody;
                const encrypted = await body!.arrayBuffer();
                const plain = await decrypt(encrypted, key);
                data = JSON.parse(plain);
            } catch (x) {}

            console.log("load", data, version);
            return { data, version };
        },
        async save({ data, version }) {
            const json = JSON.stringify(data);
            const encrypted = await encrypt(json, key);
            console.log("save", encrypted.length, version);
            const result = await getBlob(con).uploadData(encrypted, {
                conditions: {
                    ifMatch: version,
                },
            });
            console.log("actual version", result.etag);
            return result.etag!;
        },
    };

    return (
        <div className="app">
            {!key || !con || showConfig ? (
                <div className="storage-options">
                    <h2>Encryption key</h2>
                    {!key ? (
                        <p>You don't currently have an encryption key.</p>
                    ) : (
                        <>
                            <p>You already have an encryption key.</p>
                            <p>
                                <input
                                    readOnly
                                    value={key}
                                    onClick={e =>
                                        (e.target as HTMLInputElement).select()
                                    }
                                />
                            </p>
                        </>
                    )}
                    <p>
                        <button onClick={onClickGenerateKey}>
                            Generate Key
                        </button>
                    </p>
                    <h2>Blob Connection String</h2>
                    <p>
                        <input
                            value={editingCon}
                            onChange={e => setEditingCon(e.target.value)}
                        />
                        {editingCon != con && (
                            <>
                                <button onClick={() => setCon(editingCon)}>
                                    Save
                                </button>
                                <button onClick={() => setEditingCon(con)}>
                                    Revert
                                </button>
                            </>
                        )}
                    </p>
                    <hr />
                    <p>
                        <button onClick={() => setShowConfig(false)}>
                            Back
                        </button>
                    </p>
                </div>
            ) : (
                <>
                    <div className="storage-options-bar">
                        <span
                            className="storage-options-link"
                            onClick={() => setShowConfig(true)}>
                            Show storage options
                        </span>
                    </div>
                    <div className="app-content">
                        <StorageContext.Provider value={ctx}>
                            {children}
                        </StorageContext.Provider>
                    </div>
                </>
            )}
        </div>
    );
}
