"use client";
import { Check, RotateCcw, Pencil, Trash2, Repeat, Copy } from "lucide-react";
import type { Item } from "@/lib/types";
export default function ItemRow({
    item,
    busy,
    onToggle,
    onEdit,
    onDelete,
    onDuplicate,
}: {
    item: Item;
    busy: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const bought = item.status === "BOUGHT";
    return (
        <div className={`item-row ${bought ? "bought" : ""}`}>
            <button
                className={`check-button ${bought ? "checked" : ""}`}
                onClick={onToggle}
                role="checkbox"
                aria-checked={bought}
                disabled={busy}
                aria-label={`Mark ${item.name} ${bought ? "yet to buy" : "bought"}`}>
                {bought && <Check size={19} />}
            </button>
            <div className="item-info">
                <div className="item-name">
                    <span>{item.name}</span>
                    <strong
                        className="item-quantity"
                        aria-label={`Quantity: ${item.quantity}`}>
                        {item.quantity}
                    </strong>
                    {item.isRecurring && (
                        <Repeat size={13} aria-label="Regular purchase" />
                    )}
                </div>
                <div className="item-meta">
                    Added by {item.addedBy?.name ?? "Family"}
                    {item.estimatedPrice != null && (
                        <>
                            <span>·</span>Est. {item.estimatedPrice.toFixed(2)}
                        </>
                    )}
                    {item.purchaseLocation && (
                        <>
                            <span>·</span>Buy at {item.purchaseLocation}
                        </>
                    )}
                </div>
                {bought && (
                    <div className="purchaser">
                        Bought by {item.boughtBy?.name ?? "Family"}
                        {item.buyLocation &&
                            ` · ${new Date(item.buyLocation).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                    </div>
                )}
            </div>
            <div className="item-actions">
                {bought ? (
                    <button
                        className="text-button buy-again"
                        aria-label={`Buy ${item.name} again`}
                        onClick={onDuplicate}
                        disabled={busy}>
                        <RotateCcw size={15} />
                        <span>Buy again</span>
                    </button>
                ) : (
                    <>
                        <button
                            className="icon-button edit"
                            onClick={onEdit}
                            disabled={busy}
                            aria-label={`Edit ${item.name}`}>
                            <Pencil size={16} />
                        </button>
                        <button
                            className="icon-button duplicate"
                            onClick={onDuplicate}
                            disabled={busy}
                            aria-label={`Duplicate ${item.name}`}
                            title="Duplicate item">
                            <Copy size={16} />
                        </button>
                    </>
                )}
                <button
                    className="icon-button delete"
                    onClick={onDelete}
                    disabled={busy}
                    aria-label={`Delete ${item.name}`}>
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
