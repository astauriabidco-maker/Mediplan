import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

export const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });

export const renderWithQueryClient = (
    ui: ReactElement,
    options?: RenderOptions,
) => {
    const queryClient = createTestQueryClient();

    return {
        queryClient,
        ...render(
            <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
            options,
        ),
    };
};
