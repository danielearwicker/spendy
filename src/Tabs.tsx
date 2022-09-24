import { useState } from "react";
import { useSpendyStorage } from "./reducer";
import { UploadFiles } from "./UploadFiles";
import { UnmatchedAmazon } from "./UnmatchedAmazon";
import { Explorer } from "./Explorer";

const tabs = ["uploads", "explorer", "unmatched"] as const;

type Tab = typeof tabs[number];

export function Tabs() {
    const [state, dispatch] = useSpendyStorage();

    const [tab, setTab] = useState<Tab>("explorer");

    return (
        <div className="tabs">
            <div className="tab-buttons">
                {tabs.map(x => (
                    <div
                        key={x}
                        className={`tab ${x === tab ? "selected" : ""}`}
                        onClick={() => setTab(x)}>
                        {x}
                    </div>
                ))}
            </div>
            <div className="tab-content">
                {tab === "uploads" ? (
                    <UploadFiles dispatch={dispatch} />
                ) : tab === "explorer" ? (
                    <Explorer state={state} dispatch={dispatch} />
                ) : tab === "unmatched" ? (
                    <UnmatchedAmazon state={state} dispatch={dispatch} />
                ) : (
                    <div>No such tab {tab}</div>
                )}
            </div>
        </div>
    );
}
