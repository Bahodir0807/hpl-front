"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type SearchComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  onSearchChange?: (query: string) => void;
};

export function SearchCombobox({
  value,
  onChange,
  options,
  placeholder = "Выберите значение",
  searchPlaceholder = "Поиск...",
  emptyLabel = "Ничего не найдено",
  disabled = false,
  loading = false,
  ariaLabel,
  onSearchChange,
}: SearchComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (onSearchChange) {
      return options;
    }

    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [onSearchChange, options, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none focus:border-slate-500 disabled:bg-slate-100"
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-500"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 p-2">
            <input
              value={search}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearch(nextValue);
                onSearchChange?.(nextValue);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {loading ? (
              <div className="px-3 py-2 text-sm text-slate-600">Загрузка...</div>
            ) : null}

            {!loading && filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">{emptyLabel}</div>
            ) : null}

            {!loading
              ? filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearch("");
                      onSearchChange?.("");
                    }}
                    className={`block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      option.value === value
                        ? "bg-slate-100 font-medium text-slate-950"
                        : "text-slate-800"
                    }`}
                  >
                    <div>{option.label}</div>
                    {option.description ? (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {option.description}
                      </div>
                    ) : null}
                  </button>
                ))
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
