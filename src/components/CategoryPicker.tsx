import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import type { Category } from "@/types";
import { createCategory } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface Props {
  categories: Category[];
  value: string | null;
  onChange: (category: Category | null) => void;
  onCategoryCreated: (category: Category) => void;
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  onCategoryCreated,
}: Props) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { notify } = useToast();

  const selectedCategory = categories.find((category) => category.id === value);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    return categories
      .filter((category) => {
        if (!term) return true;
        return category.name.toLowerCase().includes(term);
      })
      .slice(0, 8);
  }, [categories, query]);

  async function handleCreate() {
    const name = newName.trim();

    if (!name) {
      notify("error", "Category name is required.");
      return;
    }

    const existing = categories.find(
      (category) => category.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      onChange(existing);
      setNewName("");
      setShowCreate(false);
      setQuery("");
      notify("success", `"${existing.name}" selected.`);
      return;
    }

    setCreating(true);

    try {
      const category = await createCategory({
        name,
      });

      onCategoryCreated(category);
      onChange(category);

      setNewName("");
      setShowCreate(false);
      setQuery("");

      notify(
        "success",
        `Category "${category.name}" created and selected.`
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not create category."
      );
    } finally {
      setCreating(false);
    }
  }

  function clearCategory() {
    onChange(null);
    setQuery("");
  }

  return (
    <div className="space-y-2">
      {selectedCategory ? (
        <div className="flex items-center justify-between rounded-lg border border-ink/10 bg-ink/3 px-3 py-2 dark:border-paper/10 dark:bg-paper/5">
          <div>
            <p className="text-sm font-medium text-ink dark:text-paper">
              {selectedCategory.name}
            </p>

            {selectedCategory.description && (
              <p className="text-xs text-ink/45 dark:text-paper/45">
                {selectedCategory.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={clearCategory}
            className="text-ink/40 hover:text-red-500 dark:text-paper/40"
            aria-label="Clear category"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-paper/35"
            />

            <input
              className="input pl-9"
              placeholder="Search or select a category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {query.trim() && results.length > 0 && (
              <div className="card absolute z-20 mt-1 w-full overflow-hidden py-1">
                {results.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      onChange(category);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink/5 dark:hover:bg-paper/5"
                  >
                    <span>{category.name}</span>
                    <Check
                      size={14}
                      className="text-ink/30 dark:text-paper/30"
                    />
                  </button>
                ))}
              </div>
            )}

            {query.trim() && results.length === 0 && (
              <div className="card absolute z-20 mt-1 w-full px-3 py-3 text-sm text-ink/50 dark:text-paper/50">
                No category found.
              </div>
            )}
          </div>

          {!showCreate ? (
            <button
              type="button"
              onClick={() => {
                setNewName(query.trim());
                setShowCreate(true);
              }}
              className="btn-ghost text-xs !px-2"
            >
              <Plus size={14} />
              New category
            </button>
          ) : (
            <div className="card space-y-2 p-3">
              <input
                className="input"
                placeholder="Category name *"
                value={newName}
                autoFocus
                onChange={(e) => setNewName(e.target.value)}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="btn-primary text-xs"
                >
                  {creating ? "Creating…" : "Create & select"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                  }}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}