import { useEffect, useState } from 'react'
import { auth, db } from './lib/firebase'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'

export default function App() {
    const [uid, setUid] = useState<string | null>(null)
    const [count, setCount] = useState<number | null>(null)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => setUid(u?.uid ?? null))
        signInAnonymously(auth)
        return () => unsub()
    }, [])

    useEffect(() => {
        ;(async () => {
            const snap = await getDocs(collection(db, 'artworks'))
            setCount(snap.size)
        })()
    }, [])

    return (
        <div style={{ padding: 24 }}>
            <h1>PixSeed Dev (Local)</h1>
            <p>UID: {uid ?? '(signing...)'}</p>
            <p>artworks count: {count ?? '(loading...)'}</p>
        </div>
    )
}
