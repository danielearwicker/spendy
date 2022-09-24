import { useState } from "react";

export function useLocalStorageState(name: string, defaultValue = "") {
    const [val, setVal] = useState(localStorage.getItem(name) ?? defaultValue);

    function setValAndStore(update: React.SetStateAction<string>) {
        setVal(oldVal => {
            const newVal =
                typeof update === "function" ? update(oldVal) : update;
            localStorage.setItem(name, newVal);
            return newVal;
        });
    }

    return [val, setValAndStore] as const;
}
