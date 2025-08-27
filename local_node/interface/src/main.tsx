import { createRoot } from 'react-dom/client'
import { RouterProvider } from "react-router";
import { router } from '@/route';
import "@xterm/xterm/css/xterm.css"
import './index.css'

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
