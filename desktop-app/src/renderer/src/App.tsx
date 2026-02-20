import { createHashRouter, RouterProvider } from 'react-router-dom'
import './assets/main.css'

import { Layout } from './components/Layout'
import { ImportParse } from './pages/ImportParse'
import { DataVerification } from './pages/DataVerification'
import { AgenticReporting } from './pages/AgenticReporting'
import { Settings } from './pages/Settings'

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ImportParse />,
      },
      {
        path: "verification",
        element: <DataVerification />,
      },
      {
        path: "reporting",
        element: <AgenticReporting />,
      },
      {
        path: "settings",
        element: <Settings />,
      }
    ]
  },
]);

export function App() {
  return <RouterProvider router={router} />
}
