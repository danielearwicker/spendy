import { useSpendyStorage } from "./reducer";
import { UploadFiles } from "./UploadFiles";
import { UnmatchedAmazon } from "./UnmatchedAmazon";
import { Explorer } from "./Explorer";
import {
    BrowserRouter,
    Navigate,
    NavLink,
    Route,
    Routes,
} from "react-router-dom";

const tabs = ["uploads", "explorer", "unmatched"] as const;

type Tab = typeof tabs[number];

export function Tabs() {
    const [state, dispatch] = useSpendyStorage();

    // const [tab, setTab] = useState<Tab>("explorer");

    return (
        <BrowserRouter>
            <div className="tabs">
                <div className="tab-buttons">
                    {tabs.map(x => (
                        <NavLink to={x} key={x}>
                            <div className="tab">{x}</div>
                        </NavLink>
                    ))}
                </div>
                <div className="tab-content">
                    <Routes>
                        <Route
                            index
                            element={<Navigate to="explorer" replace />}
                        />
                        <Route
                            path="uploads"
                            element={<UploadFiles dispatch={dispatch} />}
                        />
                        <Route
                            path="explorer"
                            element={
                                <Explorer state={state} dispatch={dispatch} />
                            }
                        />
                        <Route
                            path="unmatched"
                            element={
                                <UnmatchedAmazon
                                    state={state}
                                    dispatch={dispatch}
                                />
                            }
                        />
                    </Routes>
                </div>
            </div>
        </BrowserRouter>
    );
}
