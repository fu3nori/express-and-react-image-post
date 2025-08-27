import { useNavigate, useLocation, Link } from "react-router-dom";
import { signInWithGoogle } from "../lib/firebase";

export default function Top() {
    const nav = useNavigate();
    const loc = useLocation() as any;
    const from = loc.state?.from?.pathname || "/me";

    async function onGoogle() {
        await signInWithGoogle();
        nav(from, { replace: true });
    }
    return (
        <main className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">PolySeed(β)</h1>
            <p className="mb-6">3DCG Gallery</p>

            <div className="flex gap-3 flex-wrap">
                <div className="left text-center">
                    <span onClick={onGoogle} className="px-4 py-2 border rounded">Googleでログイン<br /><img  src="./image/login.png" /></span><br />
                </div>

                <div className="left text-center">
                    <span onClick={onGoogle} className="px-4 py-2 border rounded">Googleでサインアップ<br /><img  src="./image/sign_up.png" /></span><br />
                </div>

                <div className="left text-center">
                    <Link to="/works" className="px-4 py-2 border rounded"><button className="custom-button top-10">作品を閲覧する</button></Link>
                </div>
                <div className="clear"></div>
            </div>
        </main>
    );
}
