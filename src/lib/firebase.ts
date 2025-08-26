import { initializeApp } from "firebase/app";
import {
    getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithPopup, signOut,
} from "firebase/auth";
import {
    getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    appId: import.meta.env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { serverTimestamp as ts };
// エミュ接続
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
}

export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await ensureUserDocument();
    return cred;
}

export async function logout() {
    await signOut(auth);
}

/**
 * 初回ログイン時に users/{uid} を作成（将来の独自アカウント用の項目もプリセット）
 */
export async function ensureUserDocument() {
    const u = auth.currentUser;
    if (!u) return;
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;

    await setDoc(ref, {
        uid: u.uid,
        handleName: u.displayName || "NoName",
        email: u.email || null,
        provider: "google",
        avatarURL: u.photoURL || null,
        homepageURL: null,
        // 独自アカウント用に将来使用（今は null でプレースホルダ）
        passwordHash: null,
        passwordReminderCode: null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}
