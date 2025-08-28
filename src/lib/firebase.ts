import { initializeApp } from "firebase/app";
import {
    getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithPopup, signOut,
} from "firebase/auth";
import {
    getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
/** 必須ENVの存在チェック（開発ビルド時のみ厳しめ） */
function req(name: string): string {
    const v = (import.meta as any).env?.[name];
    if (!v && import.meta.env.DEV) {
        console.warn(`[firebase.ts] Missing env: ${name}`);
    }
    return v as string;
}

/** firebasestorage.app を渡されても appspot.com に補正 */
function normalizeBucket(bucket?: string): string | undefined {
    if (!bucket) return bucket;
    return bucket.endsWith(".firebasestorage.app")
        ? bucket.replace(".firebasestorage.app", ".appspot.com")
        : bucket;
}

const firebaseConfig = {
    apiKey: req("VITE_API_KEY"),
    authDomain: req("VITE_AUTH_DOMAIN"),
    projectId: req("VITE_PROJECT_ID"),
    storageBucket: normalizeBucket(req("VITE_STORAGE_BUCKET")),
    appId: req("VITE_APP_ID"),
};

const app = initializeApp(firebaseConfig);
if (import.meta.env.PROD && import.meta.env.VITE_APPCHECK_SITE_KEY) {
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(import.meta.env.VITE_APPCHECK_SITE_KEY as string),
        isTokenAutoRefreshEnabled: true,
    });
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { serverTimestamp as ts };

/** エミュ接続：環境フラグ or ローカルホストで有効化 */
const useAuthEmu = import.meta.env.VITE_USE_AUTH_EMULATOR === "1";
const useFsEmu  = import.meta.env.VITE_USE_FIRESTORE_EMULATOR === "1";
const useStEmu  = import.meta.env.VITE_USE_STORAGE_EMULATOR === "1";
const isLocalHost =
    typeof location !== "undefined" &&
    (location.hostname === "localhost" || location.hostname === "127.0.0.1");

if (useAuthEmu || isLocalHost) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}
if (useFsEmu || isLocalHost) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
if (useStEmu || isLocalHost) {
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

/** 初回ログイン時に users/{uid} を作成（将来の独自アカウント項目はプレースホルダ） */
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
        passwordHash: null,           // 未来の独自アカウント用
        passwordReminderCode: null,   // 未来の独自アカウント用
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}
