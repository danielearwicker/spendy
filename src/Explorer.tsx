import { useMemo, useState } from "react";
import {
    normalizeCategory,
    SpendyAction,
    SpendyState,
    useSpendyStorage,
} from "./reducer";
import {
    dateAdd,
    formatBankAmount,
    getPattern,
    getPaymentsWithCategories,
    Payment,
    quarterFromDate,
    sort,
} from "./statements";
import { Storage } from "./Storage";
import { StackedBar } from "./StackedBar";
import { RenameCategory } from "./RenameCategory";
import { CategoryPath, getPathElements } from "./CategoryPath";
import { ChildCategories, getChildCategory } from "./ChildCategories";
import { getCategoryColour } from "./colours";
import { Select } from "./inputComponents/Select";

interface PaymentLineProps {
    payment: Payment & {
        category: string;
    };
}

function PaymentLine({ payment }: PaymentLineProps) {
    return (
        <>
            <tr>
                <td>{payment.date}</td>
                <td>{payment.category ?? "[category]"}</td>
                <td>{payment.description}</td>
                <td>{formatBankAmount(payment.amount)}</td>
            </tr>
        </>
    );
}

export const paymentTypes = [
    "debits",
    "credits",
    "net per",
    "net running",
] as const;

export type PaymentType = typeof paymentTypes[number];

export const dateRanges = [
    "last 30 days",
    "last 12 months",
    "all time",
] as const;

export type DateRange = typeof dateRanges[number];

export interface ExplorerProps {
    state: SpendyState;
    dispatch: (action: SpendyAction) => void;
}

export function Explorer({ state, dispatch }: ExplorerProps) {
    const [path, setPath] = useState("");
    const [search, setSearch] = useState("");

    const [type, setType] = useState<PaymentType>("debits");
    const [dateRange, setDateRange] = useState<DateRange>("last 30 days");

    const [tableFilter, setTableFilter] = useState<
        undefined | { bar: string; segment?: string }
    >();

    const latestDate = useMemo(
        () =>
            state.payments
                .map(x => x.date)
                .reduce(
                    (l, r) => (l.localeCompare(r) > 0 ? l : r),
                    "2000-01-01"
                ),
        [state.payments]
    );

    const startDate =
        dateRange === "last 12 months"
            ? dateAdd(latestDate, "months", -12)
            : dateRange === "last 30 days"
            ? dateAdd(latestDate, "days", -30)
            : "2000-01-01";

    const getDateBar =
        dateRange === "last 12 months"
            ? (d: string) => d.substring(0, 7)
            : dateRange === "last 30 days"
            ? (d: string) => d
            : quarterFromDate;

    const paymentsWithCategories = useMemo(
        () =>
            getPaymentsWithCategories(
                state.payments,
                state.patternsToCategories
            ),
        [state.payments, state.patternsToCategories]
    );

    const showCredits = type === "credits";
    const searchLower = search.toLocaleLowerCase();

    const filtered = useMemo(
        () =>
            paymentsWithCategories.filter(
                x =>
                    x.date.localeCompare(startDate) >= 0 &&
                    (type === "net per" ||
                        type === "net running" ||
                        x.amount > 0 === showCredits) &&
                    `${x.category}/`.startsWith(path) &&
                    (!searchLower ||
                        x.description.toLocaleLowerCase().includes(searchLower))
            ),
        [
            paymentsWithCategories,
            startDate,
            type,
            showCredits,
            path,
            searchLower,
        ]
    );

    const excludedCategoriesObj = Object.fromEntries(
        state.excludedCategories.map(c => [c, true])
    );

    function setExcludedCategory(category: string, excluded: boolean) {
        dispatch({ type: "CATEGORY_EXCLUDE", category, excluded });
    }

    const filteredForExcludedCategories = filtered.filter(x =>
        getPathElements(x.category).every(pe => !excludedCategoriesObj[pe.path])
    );

    const sorted = useMemo(
        () =>
            sort(filteredForExcludedCategories)
                .by("date")
                .thenBy("line")
                .thenBy("description")
                .thenBy("amount")
                .value(),
        [filteredForExcludedCategories]
    );

    const netBars = useMemo(() => {
        const bars: {
            bar: string;
            value: number;
            segment: string;
        }[] = [];

        for (const payment of sorted) {
            const current = bars[bars.length - 1];
            const bar = getDateBar(payment.date);
            if (current?.bar !== bar) {
                bars.push({
                    bar,
                    value:
                        (type === "net running" ? current?.value ?? 0 : 0) +
                        payment.amount,
                    segment: "net value",
                });
            } else {
                current.value += payment.amount;
            }
        }

        return bars;
    }, [sorted]);

    function setCategory(category: string) {
        for (const p of filtered) {
            dispatch({
                type: "CATEGORY_SET",
                pattern: getPattern(p.description),
                category,
            });
        }

        setSearch("");
    }

    function rename(renamed: string) {
        dispatch({
            type: "CATEGORY_RENAME",
            category: normalizeCategory(path),
            renamed,
        });

        setPath(renamed + "/");
    }

    function toggleTableFilter(bar: string, segment?: string) {
        if (tableFilter?.bar === bar && tableFilter?.segment === segment) {
            setTableFilter(undefined);
        } else {
            setTableFilter({ bar, segment });
        }
    }

    const filteredForTable = !tableFilter
        ? sorted
        : sorted.filter(
              p =>
                  getDateBar(p.date) === tableFilter.bar &&
                  (!tableFilter.segment ||
                      getChildCategory(path, p.category) ===
                          tableFilter.segment)
          );

    return (
        <div className="explorer">
            <div className="path">
                <CategoryPath path={path} setPath={setPath} />
                {!!path && (
                    <RenameCategory
                        category={normalizeCategory(path)}
                        rename={rename}
                    />
                )}
                <Select<PaymentType>
                    value={type}
                    options={paymentTypes}
                    onChange={setType}
                />
                <Select<DateRange>
                    value={dateRange}
                    options={dateRanges}
                    onChange={setDateRange}
                />
            </div>

            <div className="panel-container">
                <div className="children">
                    <ChildCategories
                        payments={filtered}
                        path={path}
                        setPath={setPath}
                        excludedCategories={excludedCategoriesObj}
                        setExcludedCategory={setExcludedCategory}
                    />
                </div>
                <div className="leaf">
                    <div className="filter">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {type === "net per" || type === "net running" ? (
                        <StackedBar
                            source={netBars}
                            sort="bar"
                            format={formatBankAmount}
                            onClick={toggleTableFilter}
                        />
                    ) : (
                        <StackedBar
                            source={filteredForExcludedCategories.map(p => ({
                                bar: getDateBar(p.date),
                                segment:
                                    getChildCategory(path, p.category) ?? "",
                                value: Math.abs(p.amount),
                            }))}
                            sort="bar"
                            format={formatBankAmount}
                            colour={getCategoryColour}
                            highlight={tableFilter}
                            onClick={toggleTableFilter}
                        />
                    )}

                    <div className="table">
                        <table>
                            <thead>
                                <tr>
                                    <td>Date</td>
                                    <td>Category</td>
                                    <td>Description</td>
                                    <td>Amount</td>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredForTable.map((x, n) => (
                                    <PaymentLine key={x.index} payment={x} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
