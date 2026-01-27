import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem'
        }}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                    padding: '0.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    backgroundColor: currentPage === 1 ? 'var(--color-bg)' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', gap: '0.25rem' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        style={{
                            padding: '0.5rem 0.75rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            backgroundColor: currentPage === page ? 'var(--color-primary)' : 'white',
                            color: currentPage === page ? 'white' : 'var(--color-text)',
                            cursor: 'pointer',
                            fontWeight: currentPage === page ? 600 : 400,
                            fontSize: '0.875rem',
                            minWidth: '36px'
                        }}
                    >
                        {page}
                    </button>
                ))}
            </div>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                    padding: '0.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    backgroundColor: currentPage === totalPages ? 'var(--color-bg)' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}

// Helper hook for pagination
export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
    const totalPages = Math.ceil(items.length / itemsPerPage);

    const getPageItems = (currentPage: number) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return items.slice(startIndex, startIndex + itemsPerPage);
    };

    return { totalPages, getPageItems };
}
