import { Link } from "react-router-dom";

export default function Top() {
    return (
        <main className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">PolySeed(β)</h1>
            <p className="mb-6">3DCG Gallery</p>

            <div className="flex gap-3 flex-wrap">
                <div className="left text-center">
                    <Link to="/login" className="px-4 py-2 border rounded">Googleでログイン<br /><img  src="./image/login.png" /></Link><br />
                </div>

                <div className="left text-center">
                    <Link to="/login" className="px-4 py-2 border rounded">Googleでサインアップ<br /><img  src="./image/sign_up.png" /></Link><br />
                </div>

                <div className="left text-center">
                    <Link to="/works" className="px-4 py-2 border rounded"><button className="custom-button top-10">作品を閲覧する</button></Link>
                </div>
                <div className="clear"></div>
            </div>
        </main>
    );
}
