import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabaseConfigured } from "./supabase";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Locations from "./pages/Locations";
import Movements from "./pages/Movements";
import Warehouse3D from "./pages/Warehouse3D";
import Reports from "./pages/Reports";
import Users from "./pages/Users";

function Protected({ children, roles }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="screen-center"><div className="loader" />Cargando StockVision 3D...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <div className="screen-center"><div className="notice error">No se pudo cargar tu perfil. Verifica la migración SQL y vuelve a iniciar sesión.</div></div>;
  if (roles && !roles.includes(profile.rol)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="screen-center">
        <div className="setup-card">
          <div className="brand-mark large">SV</div>
          <h1>Configura StockVision 3D</h1>
          <p>Copia <code>frontend/.env.example</code> como <code>frontend/.env</code> y completa la URL y la clave pública de tu proyecto Supabase.</p>
          <p>Configura también <code>backend/.env</code> y ejecuta el script SQL de la carpeta <code>database</code>.</p>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/productos" element={<Protected><Products /></Protected>} />
      <Route path="/ubicaciones" element={<Protected><Locations /></Protected>} />
      <Route path="/movimientos" element={<Protected roles={["admin","encargado"]}><Movements /></Protected>} />
      <Route path="/almacen-3d" element={<Protected><Warehouse3D /></Protected>} />
      <Route path="/reportes" element={<Protected><Reports /></Protected>} />
      <Route path="/usuarios" element={<Protected roles={["admin"]}><Users /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
