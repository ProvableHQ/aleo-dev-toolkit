import { Navigate, RouteObject } from 'react-router-dom';
import { Layout } from '@/components/layout';
import {
  WalletConnectPage,
  ExecuteTransactionPage,
  DeployProgramPage,
  SignMessagePage,
  DecryptPage,
  RecordsPage,
  ViewKeysPage,
  TransactionHistoryPage,
} from '@/pages';
import { CustomizationsPage } from './pages/CustomizationsPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/wallet" replace />,
      },
      {
        path: 'wallet',
        element: <WalletConnectPage />,
      },
      {
        path: 'customizations',
        element: <CustomizationsPage />,
      },
      {
        path: 'execute',
        element: <ExecuteTransactionPage />,
      },
      {
        path: 'deploy',
        element: <DeployProgramPage />,
      },
      {
        path: 'sign',
        element: <SignMessagePage />,
      },
      {
        path: 'decrypt',
        element: <DecryptPage />,
      },
      {
        path: 'records',
        element: <RecordsPage />,
      },
      {
        path: 'view-keys',
        element: <ViewKeysPage />,
      },
      {
        path: 'history',
        element: <TransactionHistoryPage />,
      },
    ],
  },
];
