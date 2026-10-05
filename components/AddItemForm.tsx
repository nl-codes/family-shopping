"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { categories, type Item } from "@/lib/types";
export default function AddItemForm({
  initial,
  customCategories = [],
  onSave,
  onClose,
  busy,
}: {
  initial?: Item;
  customCategories?: string[];
  onSave: (data: object) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [error, setError] = useState("");
  const savedCategories = [
    ...new Set([...customCategories, ...(initial ? [initial.category] : [])]),
  ]
    .filter((value) => !categories.some((preset) => preset === value))
    .sort((a, b) => a.localeCompare(b));
  const [category, setCategory] = useState(initial?.category ?? "Produce");
  const [customCategory, setCustomCategory] = useState("");
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <div className="section-heading">
          <h2 id="form-title">{initial ? "Edit item" : "What do we need?"}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close form"
            disabled={busy}
          >
            <X size={20} />
          </button>
        </div>
        <p className="muted">The little things that keep home running.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setError("");
            try {
              await onSave({
                name: data.get("name"),
                quantity: data.get("quantity"),
                category:
                  category === "Other"
                    ? customCategory.trim() || "Other"
                    : category,
                isRecurring: data.get("isRecurring") === "on",
                estimatedPrice: data.get("estimatedPrice")
                  ? Number(data.get("estimatedPrice"))
                  : null,
              });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label>
            Item name
            <input
              name="name"
              placeholder="e.g. Fresh tomatoes"
              defaultValue={initial?.name}
              required
              maxLength={160}
              autoFocus
            />
          </label>
          <div className="form-grid">
            <label>
              Quantity
              <input
                name="quantity"
                defaultValue={initial?.quantity ?? "1"}
                required
                maxLength={60}
                placeholder="2 kg"
              />
            </label>
            <label>
              Category
              <select
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories
                  .filter((value) => value !== "Other")
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                {savedCategories.length > 0 && (
                  <optgroup label="Custom categories">
                    {savedCategories.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="Other">Other / Add custom category</option>
              </select>
            </label>
          </div>
          {category === "Other" && (
            <label>
              Custom category (optional)
              <input
                name="customCategory"
                value={customCategory}
                onChange={(event) => setCustomCategory(event.target.value)}
                maxLength={60}
                placeholder="e.g. Clothing or Puja supplies"
                aria-describedby="custom-category-help"
              />
              <span id="custom-category-help" className="field-help">
                Leave blank to keep this item in Other.
              </span>
            </label>
          )}
          <label>
            Estimated price (optional)
            <input
              name="estimatedPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial?.estimatedPrice ?? undefined}
              placeholder="0.00"
            />
          </label>
          <label className="checkbox-label">
            <input
              name="isRecurring"
              type="checkbox"
              defaultChecked={initial?.isRecurring}
            />{" "}
            A regular purchase
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary wide" disabled={busy}>
            <Plus size={18} />
            {busy ? "Saving…" : initial ? "Save changes" : "Add to list"}
          </button>
        </form>
      </section>
    </div>
  );
}
