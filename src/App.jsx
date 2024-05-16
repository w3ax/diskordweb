import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import StoragePage from "./pages/StoragePage.jsx";
import NoPage from "./pages/NoPage.jsx";
import FilePage from "./pages/FilePage.jsx";
import FileProvider from "./Context/FileContext.jsx";


export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/storage" element={<StoragePage />} />
                    <Route path="/files/:id" element={<FileProvider><FilePage /></FileProvider>} />
                    <Route path="/*" element={<NoPage />} />
            </Routes>
        </BrowserRouter>
    );
}
