"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ShoppingBag,
    LayoutGrid,
    Rows3,
    Plus,
    ArrowUpRight,
    Leaf,
    Milk,
    Package,
    SprayCan,
    Plug,
    Shapes,
    Archive,
    RefreshCw,
    Users,
    Check,
    List as ListIcon,
    Lock,
    Search,
    KeyRound,
    Eye,
} from "lucide-react";
import { categories, type Item, type User, type List } from "@/lib/types";
import ItemRow from "./ItemRow";
import AddItemForm from "./AddItemForm";
type ItemView = "card" | "list" | "compact";
const viewOptions = [
    { value: "card", label: "Card", icon: LayoutGrid },
    { value: "list", label: "List", icon: ListIcon },
    { value: "compact", label: "Compact", icon: Rows3 },
] as const;
const categoryIcons = [Leaf, Milk, Package, SprayCan, Plug, Shapes];
async function request<T>(
    url: string,
    method = "GET",
    data?: object,
): Promise<T> {
    const response = await fetch(url, {
        method,
        cache: "no-store",
        ...(data
            ? {
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
              }
            : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Something went wrong");
    return result;
}
export default function ShoppingList() {
    const [users, setUsers] = useState<User[]>([]),
        [lists, setLists] = useState<List[]>([]),
        [items, setItems] = useState<Item[]>([]);
    const [actor, setActor] = useState(""),
        [listId, setListId] = useState(""),
        [tab, setTab] = useState<"ALL" | "YET_TO_BUY" | "BOUGHT">("ALL");
    const [loading, setLoading] = useState(true),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        [modal, setModal] = useState<"add" | "user" | "list" | null>(null),
        [editing, setEditing] = useState<Item>();
    const [showArchived, setShowArchived] = useState(false);
    const [itemView, setItemView] = useState<ItemView>("list");
    const [listSearch, setListSearch] = useState("");
    const [accessListId, setAccessListId] = useState("");
    const [accessCode, setAccessCode] = useState("");
    const [accessError, setAccessError] = useState("");
    const [ownerCode, setOwnerCode] = useState("");
    const [ownerCodeLoading, setOwnerCodeLoading] = useState(false);
    const [ownerCodeCopied, setOwnerCodeCopied] = useState(false);
    useEffect(() => {
        try {
            const saved = localStorage.getItem("shopping-item-view");
            if (saved === "card" || saved === "list" || saved === "compact")
                setItemView(saved);
        } catch {
            /* Keep the default when browser storage is unavailable. */
        }
    }, []);
    const changeView = (view: ItemView) => {
        setItemView(view);
        try {
            localStorage.setItem("shopping-item-view", view);
        } catch {
            /* The view still works without storage. */
        }
    };
    const selectedRef = useRef("");
    const load = useCallback(async () => {
        setError("");
        try {
            const [people, allLists] = await Promise.all([
                request<User[]>("/api/users"),
                request<List[]>("/api/lists"),
            ]);
            setUsers(people);
            setLists(allLists);
            setActor((current) =>
                people.some((p) => p._id === current)
                    ? current
                    : (people.find(
                          (p) =>
                              p._id === localStorage.getItem("family-member"),
                      )?._id ??
                      people[0]?._id ??
                      ""),
            );
            setListId((current) =>
                allLists.some((l) => l._id === current && l.unlocked)
                    ? current
                    : (allLists.find((l) => !l.isArchived && l.unlocked)?._id ??
                      ""),
            );
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    useEffect(() => {
        selectedRef.current = listId;
        if (!listId) {
            setItems([]);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        fetch(`/api/items?listId=${listId}`, {
            cache: "no-store",
            signal: controller.signal,
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                setItems(data);
            })
            .catch((e) => {
                if (e.name !== "AbortError") setError(e.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [listId]);
    const refreshItems = async () => {
        const current = selectedRef.current;
        if (current) {
            const data = await request<Item[]>(`/api/items?listId=${current}`);
            if (selectedRef.current === current) setItems(data);
        }
    };
    const run = async (work: () => Promise<void>) => {
        setBusy(true);
        setError("");
        try {
            await work();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };
    const selected = lists.find((l) => l._id === listId),
        pending = items.filter((i) => i.status !== "COMPLETED"),
        bought = items.filter((i) => i.status === "COMPLETED");
    const visibleItems =
        tab === "ALL" ? items : tab === "YET_TO_BUY" ? pending : bought;
    const customCategories = [...new Set(items.map((item) => item.category))]
        .filter((category) => !categories.some((preset) => preset === category))
        .sort((a, b) => a.localeCompare(b));
    const groupedCategories = [...categories, ...customCategories];
    const visibleLists = lists
        .filter((l) => showArchived || !l.isArchived)
        .filter((l) =>
            l.title
                .toLocaleLowerCase()
                .includes(listSearch.trim().toLocaleLowerCase()),
        );
    const accessList = lists.find((list) => list._id === accessListId);
    const chooseList = (list: List) => {
        setError("");
        if (list.unlocked) {
            setListId(list._id);
            return;
        }
        setAccessListId(list._id);
        setAccessCode("");
        setAccessError("");
    };
    const loadOwnerCode = async () => {
        if (!selected?.isOwner) return;
        setOwnerCodeLoading(true);
        try {
            const result = await request<{ code: string }>(
                `/api/lists/${selected._id}/access`,
            );
            setOwnerCode(result.code);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setOwnerCodeLoading(false);
        }
    };
    const copyOwnerCode = async () => {
        if (!ownerCode) return;
        await navigator.clipboard.writeText(ownerCode);
        setOwnerCodeCopied(true);
        window.setTimeout(() => setOwnerCodeCopied(false), 1800);
    };
    useEffect(() => {
        setOwnerCode("");
        setOwnerCodeCopied(false);
        if (selected?.isOwner) void loadOwnerCode();
    }, [selected?._id, selected?.isOwner]);
    const mutateItem = (item: Item, method: string, data?: object) =>
        run(async () => {
            await request(`/api/items/${item._id}`, method, data);
            await refreshItems();
        });
    const row = (item: Item) => (
        <ItemRow
            key={item._id}
            item={item}
            busy={busy || !actor || !!selected?.isArchived}
            onToggle={() =>
                void mutateItem(item, "PATCH", {
                    status:
                        item.status === "COMPLETED" ? "PENDING" : "COMPLETED",
                    actorId: actor,
                })
            }
            onStatusChange={(status) =>
                void mutateItem(item, "PATCH", { status, actorId: actor })
            }
            onEdit={() => setEditing(item)}
            onDelete={() => {
                if (confirm(`Delete ${item.name}?`))
                    void mutateItem(item, "DELETE");
            }}
            onDuplicate={() =>
                void run(async () => {
                    await request("/api/items", "POST", {
                        listId,
                        addedBy: actor,
                        name: item.name,
                        quantity: item.quantity,
                        category: item.category,
                        isRecurring: item.isRecurring,
                        estimatedPrice: item.estimatedPrice,
                        purchaseLocation: item.purchaseLocation,
                    });
                    await refreshItems();
                })
            }
        />
    );
    return (
        <div className="app-shell">
            <aside className="sidebar">
                <a className="brand" href="/">
                    <span className="brand-icon">
                        <ShoppingBag size={23} />
                    </span>
                    together<span className="brand-dot">.</span>
                </a>
                <p className="sidebar-caption">A LITTLE LIST. A LOT OF LOVE.</p>
                <div className="sidebar-label">
                    OUR LISTS
                    <button
                        className="icon-button"
                        aria-label="Create list"
                        onClick={() => setModal("list")}
                        disabled={!actor || busy}
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <nav>
                    {visibleLists.map((list) => (
                        <button
                            key={list._id}
                            disabled={busy}
                            onClick={() => chooseList(list)}
                            className={`list-link ${listId === list._id ? "active" : ""}`}
                        >
                            <ListIcon size={18} />
                            <span>{list.title}</span>
                            {list.isArchived && <Archive size={14} />}
                            {!list.unlocked && (
                                <Lock
                                    size={14}
                                    aria-label="Access code required"
                                />
                            )}
                        </button>
                    ))}
                </nav>
                <button
                    className="text-button archive-link"
                    onClick={() => setShowArchived(!showArchived)}
                >
                    <Archive size={16} />
                    {showArchived
                        ? "Hide archived lists"
                        : "Show archived lists"}
                </button>
                <div className="family-card">
                    <div className="family-avatars">
                        <span>N</span>
                        <span>A</span>
                        <span>
                            <Users size={17} />
                        </span>
                    </div>
                    <h3>One family, one list.</h3>
                    <p>
                        From Nepal to Australia,
                        <br />
                        keep everyone in the loop.
                    </p>
                    <span className="connection">
                        <i /> Made for sharing
                    </span>
                </div>
                <div className="sidebar-bottom">
                    Home starts with the little things <span>♡</span>
                </div>
            </aside>
            <div className="main-shell">
                <header className="topbar">
                    <span className="breadcrumb">
                        Our home <span>/</span> Shopping lists
                    </span>
                    <div className="member-picker">
                        <span className="avatar">
                            {users
                                .find((u) => u._id === actor)
                                ?.name.slice(0, 1) ?? "?"}
                        </span>
                        <select
                            aria-label="Shopping as family member"
                            value={actor}
                            onChange={(event) => {
                                setActor(event.target.value);
                                localStorage.setItem(
                                    "family-member",
                                    event.target.value,
                                );
                            }}
                        >
                            {!users.length && (
                                <option value="">Choose member</option>
                            )}
                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                        <button
                            className="icon-button"
                            onClick={() => setModal("user")}
                            aria-label="Add family member"
                            disabled={busy}
                        >
                            <Plus size={17} />
                        </button>
                    </div>
                </header>
                <main>
                    <div className="eyebrow">THE EVERYDAY, ORGANIZED</div>
                    <div className="page-heading">
                        <div>
                            <h1>
                                {selected?.title ?? "A little help for home."}
                            </h1>
                            <p className="muted">
                                Less remembering. More living. Shop together.
                            </p>
                        </div>
                        <button
                            className="primary"
                            onClick={() => setModal("add")}
                            disabled={
                                !listId ||
                                !actor ||
                                busy ||
                                selected?.isArchived
                            }
                        >
                            <Plus size={20} />
                            Add item
                        </button>
                    </div>
                    <div className="mobile-list-picker">
                        <select
                            aria-label="Select shopping list"
                            value={listId}
                            onChange={(e) => {
                                const list = lists.find(
                                    (value) => value._id === e.target.value,
                                );
                                if (list) chooseList(list);
                            }}
                        >
                            <option value="" disabled>
                                Select a list
                            </option>
                            {visibleLists.map((list) => (
                                <option key={list._id} value={list._id}>
                                    {list.title}
                                    {list.isArchived ? " (archived)" : ""}
                                </option>
                            ))}
                        </select>
                        <button
                            className="icon-button"
                            onClick={() => setModal("list")}
                            disabled={!actor}
                        >
                            <Plus />
                        </button>
                    </div>
                    <section
                        className="browse-lists"
                        aria-labelledby="browse-lists-title"
                    >
                        <div className="browse-heading">
                            <div>
                                <span className="eyebrow">
                                    SHARED WITH HOME
                                </span>
                                <h2 id="browse-lists-title">Browse lists</h2>
                            </div>
                            <span className="browse-count">
                                {visibleLists.length} list
                                {visibleLists.length === 1 ? "" : "s"}
                            </span>
                        </div>
                        <label className="browse-search">
                            <Search size={16} aria-hidden="true" />
                            <span className="sr-only">Search lists</span>
                            <input
                                value={listSearch}
                                onChange={(event) =>
                                    setListSearch(event.target.value)
                                }
                                placeholder="Search by list name"
                            />
                        </label>
                        <div className="browse-results">
                            {visibleLists.map((list) => (
                                <button
                                    key={list._id}
                                    className={`browse-list ${listId === list._id ? "selected" : ""}`}
                                    onClick={() => chooseList(list)}
                                    disabled={busy}
                                >
                                    <span className="browse-list-icon">
                                        {list.unlocked ? (
                                            <ListIcon size={17} />
                                        ) : (
                                            <Lock size={16} />
                                        )}
                                    </span>
                                    <span className="browse-list-copy">
                                        <strong>{list.title}</strong>
                                        <small>
                                            {list.isArchived
                                                ? "Archived list"
                                                : list.unlocked
                                                  ? "Open list"
                                                  : "Access code required"}
                                        </small>
                                    </span>
                                    <span className="browse-list-action">
                                        {list.unlocked ? "Open" : "Unlock"}
                                    </span>
                                </button>
                            ))}
                            {!visibleLists.length && (
                                <p className="browse-empty">
                                    No lists match your search.
                                </p>
                            )}
                        </div>
                    </section>
                    {error && (
                        <div role="alert" className="error-banner">
                            {error}
                            <button
                                className="text-button"
                                onClick={() =>
                                    void run(async () => {
                                        await load();
                                        await refreshItems();
                                    })
                                }
                            >
                                <RefreshCw size={16} />
                                Retry
                            </button>
                        </div>
                    )}
                    <div className="stats">
                        <div>
                            <span className="stat-icon green">
                                <ShoppingBag size={21} />
                            </span>
                            <div>
                                <strong>{pending.length}</strong>
                                <span>Yet to buy</span>
                            </div>
                        </div>
                        <div>
                            <span className="stat-icon peach">
                                <Check size={22} />
                            </span>
                            <div>
                                <strong>{bought.length}</strong>
                                <span>In the basket</span>
                            </div>
                        </div>
                        <div className="progress-stat">
                            <div>
                                <strong>
                                    {items.length
                                        ? Math.round(
                                              (bought.length / items.length) *
                                                  100,
                                          )
                                        : 0}
                                    %
                                </strong>
                                <span>of your list, done</span>
                            </div>
                            <div className="progress-track">
                                <i
                                    style={{
                                        width: `${items.length ? (bought.length / items.length) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <section className={`list-card view-${itemView}`}>
                        <div className="list-toolbar">
                            <div
                                className="tabs"
                                role="group"
                                aria-label="Filter shopping items"
                            >
                                <button
                                    className={tab === "ALL" ? "selected" : ""}
                                    aria-pressed={tab === "ALL"}
                                    onClick={() => setTab("ALL")}
                                >
                                    View all <span>{items.length}</span>
                                </button>
                                <button
                                    className={
                                        tab === "YET_TO_BUY" ? "selected" : ""
                                    }
                                    aria-pressed={tab === "YET_TO_BUY"}
                                    onClick={() => setTab("YET_TO_BUY")}
                                >
                                    Yet to buy <span>{pending.length}</span>
                                </button>
                                <button
                                    className={
                                        tab === "BOUGHT" ? "selected" : ""
                                    }
                                    aria-pressed={tab === "BOUGHT"}
                                    onClick={() => setTab("BOUGHT")}
                                >
                                    Bought <span>{bought.length}</span>
                                </button>
                            </div>
                            <button
                                className="icon-button"
                                aria-label="Refresh shopping list"
                                onClick={() => void run(refreshItems)}
                                disabled={busy || !listId}
                            >
                                <RefreshCw size={17} />
                            </button>
                        </div>
                        <div className="view-toolbar">
                            <span>View</span>
                            <div
                                className="view-switcher"
                                role="group"
                                aria-label="Item view format"
                            >
                                {viewOptions.map(
                                    ({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-label={`${label} view`}
                                            aria-pressed={itemView === value}
                                            onClick={() => changeView(value)}
                                        >
                                            <Icon
                                                size={16}
                                                aria-hidden="true"
                                            />
                                            {label}
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
                        {loading ? (
                            <div className="empty">
                                Loading your family’s list…
                            </div>
                        ) : !listId ? (
                            <div className="empty">
                                <span className="empty-icon">
                                    <ShoppingBag size={32} />
                                </span>
                                <h2>A fresh start for your family</h2>
                                <p>
                                    Add a family member, then create your first
                                    shopping list.
                                </p>
                                <button
                                    className="primary"
                                    onClick={() =>
                                        setModal(actor ? "list" : "user")
                                    }
                                >
                                    <Plus size={18} />
                                    {actor
                                        ? "Create a list"
                                        : "Add a family member"}
                                </button>
                            </div>
                        ) : !visibleItems.length ? (
                            <div className="empty">
                                <span className="empty-icon">
                                    <Check size={30} />
                                </span>
                                <h2>
                                    {tab === "BOUGHT"
                                        ? "Your basket is waiting"
                                        : tab === "ALL"
                                          ? "Your list is ready"
                                          : "All caught up!"}
                                </h2>
                                <p>
                                    {tab === "BOUGHT"
                                        ? "Items you buy will appear here, ready to buy again."
                                        : "Add something you need and we’ll keep it here."}
                                </p>
                            </div>
                        ) : tab === "BOUGHT" ? (
                            <div className="items-container">
                                {bought.map(row)}
                            </div>
                        ) : (
                            groupedCategories.map((category, index) => {
                                const group = visibleItems.filter(
                                    (item) => item.category === category,
                                );
                                const Icon = categoryIcons[index] ?? Shapes;
                                return group.length ? (
                                    <div className="category" key={category}>
                                        <h2>
                                            <Icon size={17} />
                                            {category}
                                            <span>{group.length}</span>
                                        </h2>
                                        <div className="items-container">
                                            {group.map(row)}
                                        </div>
                                    </div>
                                ) : null;
                            })
                        )}
                        {listId && (
                            <div className="list-footer">
                                <span>
                                    {selected?.isArchived
                                        ? "This list is archived"
                                        : "A shared list for your family"}
                                </span>
                                {tab === "BOUGHT" &&
                                    bought.length > 0 &&
                                    !selected?.isArchived && (
                                        <button
                                            className="text-button"
                                            disabled={busy}
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        "Permanently clear bought items? Shopping history will be removed.",
                                                    )
                                                )
                                                    void run(async () => {
                                                        await request(
                                                            `/api/lists/${listId}?completed=true`,
                                                            "DELETE",
                                                        );
                                                        await refreshItems();
                                                    });
                                            }}
                                        >
                                            Clear bought items
                                        </button>
                                    )}
                            </div>
                        )}
                    </section>
                    <div className="below-list">
                        <span>
                            <Leaf size={16} /> A little planning goes a long
                            way.
                        </span>
                        {selected && (
                            <button
                                className="text-button"
                                disabled={busy}
                                onClick={() =>
                                    void run(async () => {
                                        await request(
                                            `/api/lists/${listId}`,
                                            "PATCH",
                                            {
                                                isArchived:
                                                    !selected.isArchived,
                                            },
                                        );
                                        if (!selected.isArchived) {
                                            setListId("");
                                        }
                                        await load();
                                    })
                                }
                            >
                                <Archive size={15} />
                                {selected.isArchived
                                    ? "Restore list"
                                    : "Archive list"}
                            </button>
                        )}
                    </div>
                    {selected?.isOwner && (
                        <div className="owner-access">
                            <div>
                                <span className="eyebrow">LIST OWNER</span>
                                <strong>Share this access code</strong>
                                <p>
                                    Anyone with this code can open the items in
                                    this list.
                                </p>
                            </div>
                            {ownerCode ? (
                                <button
                                    type="button"
                                    className="owner-code"
                                    onClick={() => void copyOwnerCode()}
                                    aria-label="Copy access code"
                                    title="Copy access code"
                                >
                                    <code>{ownerCode}</code>
                                    <span>
                                        {ownerCodeCopied ? "Copied" : "Copy"}
                                    </span>
                                </button>
                            ) : (
                                <button
                                    className="secondary"
                                    onClick={() => void loadOwnerCode()}
                                    disabled={ownerCodeLoading}
                                >
                                    <Eye size={16} />
                                    {ownerCodeLoading
                                        ? "Loading…"
                                        : "Show code"}
                                </button>
                            )}
                        </div>
                    )}
                    <div className="note-card">
                        <div>
                            <span className="eyebrow">BETTER, TOGETHER</span>
                            <h3>Everyone can lend a hand.</h3>
                            <p>
                                Choose your name above so the family knows who
                                added and bought each item.
                            </p>
                        </div>
                        <ArrowUpRight size={26} />
                    </div>
                </main>
                <footer className="page-footer">
                    A little more together, every day.
                </footer>
            </div>
            {(modal === "add" || editing) && (
                <AddItemForm
                    customCategories={customCategories}
                    initial={editing}
                    busy={busy}
                    onClose={() => {
                        setModal(null);
                        setEditing(undefined);
                    }}
                    onSave={async (data) => {
                        setBusy(true);
                        try {
                            await request(
                                editing
                                    ? `/api/items/${editing._id}`
                                    : "/api/items",
                                editing ? "PATCH" : "POST",
                                editing
                                    ? data
                                    : { ...data, listId, addedBy: actor },
                            );
                            await refreshItems();
                            setModal(null);
                            setEditing(undefined);
                        } finally {
                            setBusy(false);
                        }
                    }}
                />
            )}
            {(modal === "user" || modal === "list") && (
                <div className="modal-backdrop">
                    <section
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-title"
                    >
                        <h2 id="create-title">
                            {modal === "user"
                                ? "Meet the family"
                                : "A new shopping list"}
                        </h2>
                        <p className="muted">
                            {modal === "user"
                                ? "Your name helps everyone see who’s lending a hand."
                                : "Give this list a name that feels like home."}
                        </p>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                const data = new FormData(event.currentTarget);
                                void run(async () => {
                                    if (modal === "user") {
                                        const user = await request<User>(
                                            "/api/users",
                                            "POST",
                                            {
                                                name: data.get("name"),
                                            },
                                        );
                                        setActor(user._id);
                                        localStorage.setItem(
                                            "family-member",
                                            user._id,
                                        );
                                    } else {
                                        const list = await request<List>(
                                            "/api/lists",
                                            "POST",
                                            {
                                                title: data.get("name"),
                                                createdBy: actor,
                                            },
                                        );
                                        setListId(list._id);
                                    }
                                    await load();
                                    setModal(null);
                                });
                            }}
                        >
                            <label>
                                {modal === "user" ? "Your name" : "List name"}
                                <input
                                    name="name"
                                    required
                                    maxLength={modal === "user" ? 80 : 120}
                                    autoFocus
                                    placeholder={
                                        modal === "user"
                                            ? "e.g. Aama"
                                            : "e.g. Weekly groceries"
                                    }
                                />
                            </label>
                            {error && (
                                <p className="error" role="alert">
                                    {error}
                                </p>
                            )}
                            <div className="dialog-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setModal(null)}
                                    disabled={busy}
                                >
                                    Cancel
                                </button>
                                <button className="primary" disabled={busy}>
                                    {busy ? "Saving…" : "Create"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
            {accessList && (
                <div className="modal-backdrop">
                    <section
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="access-title"
                    >
                        <div className="section-heading">
                            <h2 id="access-title">Unlock {accessList.title}</h2>
                            <button
                                className="icon-button"
                                onClick={() => setAccessListId("")}
                                aria-label="Close access form"
                                disabled={busy}
                            >
                                <span aria-hidden="true">×</span>
                            </button>
                        </div>
                        <p className="muted">
                            Enter the six-letter code shared by the list owner.
                        </p>
                        <form
                            className="access-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                setBusy(true);
                                setAccessError("");
                                void (async () => {
                                    try {
                                        await request(
                                            `/api/lists/${accessList._id}/access`,
                                            "POST",
                                            {
                                                code: accessCode,
                                            },
                                        );
                                        const openedListId = accessList._id;
                                        await load();
                                        setListId(openedListId);
                                        setAccessListId("");
                                    } catch (e) {
                                        setAccessError((e as Error).message);
                                    } finally {
                                        setBusy(false);
                                    }
                                })();
                            }}
                        >
                            <label>
                                Access code
                                <input
                                    value={accessCode}
                                    onChange={(event) => {
                                        setAccessCode(
                                            event.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z-]/g, "")
                                                .slice(0, 7),
                                        );
                                        setAccessError("");
                                    }}
                                    placeholder="abc-def"
                                    maxLength={7}
                                    pattern="[a-zA-Z]{3}-?[a-zA-Z]{3}"
                                    autoComplete="off"
                                    autoFocus
                                    required
                                />
                            </label>
                            {accessError && (
                                <p className="error" role="alert">
                                    {accessError}
                                </p>
                            )}
                            <div className="dialog-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setAccessListId("")}
                                    disabled={busy}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="primary"
                                    disabled={
                                        busy ||
                                        accessCode.replace("-", "").length !== 6
                                    }
                                >
                                    <KeyRound size={17} />
                                    {busy ? "Checking…" : "Open list"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
