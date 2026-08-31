import { useMemo, useState } from "react";
import {
  Check,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Category } from "@/types";
import {
  createCategory,
  deleteCategory,
} from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface Props {
  categories: Category[];
  value: string | null;
  onChange: (category: Category | null) => void;
  onCategoryCreated: (category: Category) => void;
  onCategoryDeleted?: (categoryId: string) => void;
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  onCategoryCreated,
  onCategoryDeleted,
}: Props) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { notify } = useToast();

  const selectedCategory = categories.find(
    (category) => category.id === value
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    return categories
      .filter((category) => {
        if (!term) return true;

        return category.name
          .toLowerCase()
          .includes(term);
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
      (category) =>
        category.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      onChange(existing);
      setNewName("");
      setShowCreate(false);
      setQuery("");

      notify(
        "success",
        `"${existing.name}" selected.`
      );

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

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Delete category "${category.name}"?\n\n` +
        `The category will no longer appear in the category list. ` +
        `Existing products using it will keep their current category.`
    );

    if (!confirmed) return;

    setDeletingId(category.id);

    try {
      await deleteCategory(category.id);

      if (value === category.id) {
        onChange(null);
      }

      onCategoryDeleted?.(category.id);

      notify(
        "success",
        `Category "${category.name}" deleted.`
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not delete category."
      );
    } finally {
      setDeletingId(null);
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
              onChange={(e) =>
                setQuery(e.target.value)
              }
            />

            {query.trim() && results.length > 0 && (
              <div className="card absolute z-20 mt-1 w-full overflow-hidden py-1">
                {results.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-ink/5 dark:hover:bg-paper/5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(category);
                        setQuery("");
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                    >
                      <span className="truncate">
                        {category.name}
                      </span>

                      <Check
                        size={14}
                        className="shrink-0 text-ink/30 dark:text-paper/30"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(category)
                      }
                      disabled={
                        deletingId === category.id
                      }
                      className="ml-2 rounded p-1.5 text-ink/35 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-paper/35 dark:hover:bg-red-500/10"
                      aria-label={`Delete ${category.name}`}
                      title={`Delete ${category.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
                onChange={(e) =>
                  setNewName(e.target.value)
                }
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="btn-primary text-xs"
                >
                  {creating
                    ? "Creating…"
                    : "Create & select"}
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