import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  it('should initialize with page 1', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, pageSize: 10 }));
    expect(result.current.currentPage).toBe(1);
  });

  it('should compute total pages correctly', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, pageSize: 10 }));
    expect(result.current.totalPages).toBe(5);
  });

  it('should handle non-exact page division', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 51, pageSize: 10 }));
    expect(result.current.totalPages).toBe(6);
  });

  it('should return correct paginatedItems', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const { result } = renderHook(() => usePagination({ totalItems: items.length, pageSize: 10 }));

    const page1Items = items.slice(result.current.startIndex, result.current.endIndex);
    expect(page1Items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should go to next page', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, pageSize: 10 }));
    act(() => result.current.goToPage(2));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.startIndex).toBe(10);
    expect(result.current.endIndex).toBe(20);
  });

  it('should not go past last page', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, pageSize: 10 }));
    act(() => result.current.goToPage(100));
    expect(result.current.currentPage).toBe(5);
  });

  it('should not go below page 1', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, pageSize: 10 }));
    act(() => result.current.goToPage(0));
    expect(result.current.currentPage).toBe(1);
  });

  it('should go to next page', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, pageSize: 10 }));
    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(2);
  });

  it('should go to previous page', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, pageSize: 10 }));
    act(() => result.current.goToPage(3));
    act(() => result.current.previousPage());
    expect(result.current.currentPage).toBe(2);
  });

  it('should not go before page 1 with previousPage', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 50, pageSize: 10 }));
    act(() => result.current.previousPage());
    expect(result.current.currentPage).toBe(1);
  });

  it('should handle 0 items', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 0, pageSize: 10 }));
    expect(result.current.totalPages).toBe(0);
    expect(result.current.currentPage).toBe(1);
  });

  it('should handle items less than page size', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 5, pageSize: 10 }));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(5);
  });

  it('should report hasNextPage and hasPreviousPage correctly', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 30, pageSize: 10 }));

    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.hasNextPage).toBe(true);

    act(() => result.current.goToPage(2));
    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.hasNextPage).toBe(true);

    act(() => result.current.goToPage(3));
    expect(result.current.hasPreviousPage).toBe(true);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should reset to page 1 when totalItems changes', () => {
    const { result, rerender } = renderHook(
      ({ totalItems }) => usePagination({ totalItems, pageSize: 10 }),
      { initialProps: { totalItems: 50 } }
    );

    act(() => result.current.goToPage(3));
    expect(result.current.currentPage).toBe(3);

    rerender({ totalItems: 20 });
    expect(result.current.currentPage).toBe(1);
  });
});
