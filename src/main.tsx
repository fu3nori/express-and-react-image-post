import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Top from './pages/Top'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MyPage from './pages/MyPage'
import Works from './pages/Works'
import RequireAuth from './ui/RequireAuth'
import ProfileEdit from './pages/ProfileEdit'
import UploadArtwork from './pages/UploadArtwork';
import ArtworkView from './pages/ArtworkView';
import './index.css'

const router = createBrowserRouter([
    { path: '/', element: <Top /> },
    { path: '/login', element: <Login /> },
    { path: '/signup', element: <Signup /> },
    { path: '/works', element: <Works /> },
    { path: '/art/:id', element: <ArtworkView /> },
    { path: '/upload',
        element: (
            <RequireAuth>
                <UploadArtwork />
            </RequireAuth>
        )
    },
    { path: '/me', element:
            <RequireAuth>
                <MyPage />
            </RequireAuth>
    },{ path: '/me/profile',
        element: (
            <RequireAuth>
                <ProfileEdit />
            </RequireAuth>
        )
    },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>,
)
