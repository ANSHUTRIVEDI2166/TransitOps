import { useEffect, useState } from "react";
import { paginate } from "./Pagination";

export function usePagination(rows, initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = paginate(rows, safePage, pageSize);

  return {
    page: safePage,
    pageSize,
    total,
    slice,
    setPage,
    setPageSize,
  };
}
