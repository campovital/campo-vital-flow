import { useState, useMemo, useCallback } from "react";

interface UsePaginationProps<T> {
  items: T[];
  itemsPerPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedItems: T[];
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  resetPage: () => void;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
}

export function usePagination<T>({
  items,
  itemsPerPage: initialItemsPerPage = 10,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / itemsPerPage)),
    [items.length, itemsPerPage]
  );

  // Reset to page 1 if current page exceeds total pages
  const validatedPage = useMemo(() => {
    if (currentPage > totalPages) return totalPages;
    if (currentPage < 1) return 1;
    return currentPage;
  }, [currentPage, totalPages]);

  const startIndex = useMemo(
    () => (validatedPage - 1) * itemsPerPage,
    [validatedPage, itemsPerPage]
  );

  const endIndex = useMemo(
    () => Math.min(startIndex + itemsPerPage, items.length),
    [startIndex, itemsPerPage, items.length]
  );

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleSetItemsPerPage = useCallback((count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1);
  }, []);

  return {
    currentPage: validatedPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    resetPage,
    startIndex,
    endIndex,
    itemsPerPage,
    setItemsPerPage: handleSetItemsPerPage,
  };
}
