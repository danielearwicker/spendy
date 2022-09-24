import { useEffect, useReducer, useRef, useState } from "react";

export interface StateStoragePayload {
    data: object | undefined;
    version: string;
}

export interface StateStorage {
    save(payload: StateStoragePayload): Promise<string>;
    load(): Promise<StateStoragePayload>;
}

export function useStorageBackedState<T extends object, A>(
    storage: StateStorage,
    reducer: (old: T, action: A) => T,
    initialState: T,
    generateLoadAction: (state: T) => A
) {
    const [state, dispatchWithoutSave] = useReducer(reducer, initialState);

    const [version, setVersion] = useState("none");

    const shouldLoad = useRef(true);
    const [shouldSave, setShouldSave] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const loaded = await storage.load();
                if (loaded.data) {
                    dispatchWithoutSave(generateLoadAction(loaded.data as T));
                }
                console.log("Loaded version", loaded.version);
                setVersion(loaded.version);
            } catch (e) {
                console.error(e);
            }
        }

        if (shouldLoad.current) {
            shouldLoad.current = false;
            load();
        }
    }, []);

    const saveTimer = useRef<number | undefined>();
    const queuedActions = useRef<A[]>([]);

    function saveSoon() {
        if (saveTimer.current !== undefined) {
            window.clearTimeout(saveTimer.current);
        }

        saveTimer.current = window.setTimeout(() => setShouldSave(true), 2000);
    }

    useEffect(() => {
        async function reconcile() {
            try {
                await storage.save({ data: state, version });
                queuedActions.current = [];
                return;
            } catch (e) {
                const er = e as Error;
                console.log(
                    `reconcile after failing based on version`,
                    version,
                    er.message
                );

                const loaded = await storage.load();
                dispatchWithoutSave(generateLoadAction(loaded.data as T));

                console.log("Loaded version", loaded.version);
                setVersion(loaded.version);

                for (const action of queuedActions.current) {
                    console.log("Reapplying", action);
                    dispatchWithoutSave(action);
                }

                saveSoon();
            }
        }

        if (shouldSave) {
            setShouldSave(false);
            reconcile();
        }
    }, [shouldSave, state]);

    return [
        state,

        (action: A) => {
            queuedActions.current.push(action);
            dispatchWithoutSave(action);

            saveSoon();
        },
    ] as const;
}
