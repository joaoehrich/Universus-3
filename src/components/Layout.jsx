// src/components/Layout.jsx

import { Outlet, useNavigate } from "react-router-dom";
import UniverseBackground from "./UniverseBackground";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import "../styles/Layout.css";

// import { supabase } from "../services/supabase";

function Layout() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      /*
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
      */

      navigate("/");
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <UniverseBackground />

      <div id="wrapper">
        <Sidebar />

        <div id="content-wrapper">
          <Topbar onLogout={handleLogout} />

          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

export default Layout;