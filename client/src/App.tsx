import { BrowserRouter, Route, Routes } from "react-router-dom";
import StatusScreen from "./components/StatusScreen";
import Home from "./pages/student/Home";
import Lesson from "./pages/student/Lesson";
import ModuleDetails from "./pages/student/ModuleDetails";
import ModuleList from "./pages/student/ModuleList";
import Accounts from "./pages/admin/Accounts";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import ModuleEditor from "./pages/admin/ModuleEditor";
import KioskGuard from "./components/KioskGuard";

export default function App() {
  return (
    <BrowserRouter>
      <KioskGuard />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/modules/:level" element={<ModuleList />} />
        <Route path="/module/:id" element={<ModuleDetails />} />
        <Route path="/lesson/:id" element={<Lesson />} />

        {/* Admin: nothing links here, and the server blocks the data without a login */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/modules/new" element={<ModuleEditor />} />
        <Route path="/admin/modules/:id" element={<ModuleEditor />} />
        <Route path="/admin/accounts" element={<Accounts />} />

        <Route path="*" element={<StatusScreen title="Page Not Found" />} />
      </Routes>
    </BrowserRouter>
  );
}
