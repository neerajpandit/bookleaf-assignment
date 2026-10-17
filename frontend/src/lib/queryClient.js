import { QueryClient } from '@tanstack/react-query';

const isUnauthorizedError = (error) => Boolean(error?.normalized?.isUnauthorized);

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: import.meta.env.PROD,
        retry: (failureCount, error) => {
          if (isUnauthorizedError(error) || error?.normalized?.isForbidden) {
            return false;
          }
          if (error?.normalized?.isNetworkError) {
            return failureCount < 1;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });

export default createQueryClient;
