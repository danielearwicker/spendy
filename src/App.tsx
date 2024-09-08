import { Storage } from "./encryptedStorage/Storage";
import { azureBackend } from "./encryptedStorage/azureBackend";
import "./style.scss";

import { Tabs } from "./Tabs";

export function App() {
    console.log("App");
    return (
        <Storage backend={azureBackend} app="spendy">
            <Tabs />
        </Storage>
    );
}
