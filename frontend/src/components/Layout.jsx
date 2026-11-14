import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, Boxes, BarChart3, LayoutDashboard, LogOut, MapPin, Package, ArrowLeftRight, Users, Warehouse } from "lucide-react";
import { useAuth } from "../AuthContext";

const items = [
  { to:"/", label:"Panel general", icon:LayoutDashboard },
  { to:"/productos", label:"Productos", icon:Package },
  { to:"/ubicaciones", label:"Ubicaciones", icon:MapPin },
  { to:"/movimientos", label:"Movimientos", icon:ArrowLeftRight, roles:["admin","encargado"] },
  { to:"/almacen-3d", label:"Almacén 3D", icon:Boxes },
  { to:"/reportes", label:"Reportes", icon:BarChart3 },
  { to:"/usuarios", label:"Usuarios", icon:Users, roles:["admin"] },
];
const titles = {
  "/":["Panel general","Resumen operativo del inventario"],
  "/productos":["Productos","Catálogo de equipos y componentes"],
  "/ubicaciones":["Ubicaciones","Organización física del almacén"],
  "/movimientos":["Movimientos","Entradas y salidas de inventario"],
  "/almacen-3d":["Almacén 3D","Explora estanterías y ubicaciones"],
  "/reportes":["Reportes","Indicadores y análisis del inventario"],
  "/usuarios":["Usuarios","Administración de perfiles y permisos"],
};

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [title, subtitle] = titles[location.pathname] || ["StockVision 3D",""];
  const visibleItems = items.filter((item) => !item.roles || item.roles.includes(profile?.rol));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">SV</div><div><strong>StockVision <span>3D</span></strong><small>INVENTORY INTELLIGENCE</small></div></div>
        <div className="nav-caption">MENÚ PRINCIPAL</div>
        <nav className="main-nav">
          {visibleItems.map(({to,label,icon:Icon}) => (
            <NavLink key={to} to={to} end={to==="/"} className={({isActive})=>`nav-link ${isActive?"active":""}`}>
              <Icon size={18} strokeWidth={1.8}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-status"><span className="status-dot"/> Sistema de inventario</div>
          <div className="user-mini">
            <div className="avatar">{(profile?.nombre||profile?.email||"U").slice(0,1).toUpperCase()}</div>
            <div className="user-mini-copy"><strong>{profile?.nombre||profile?.email}</strong><small>{profile?.rol||"usuario"}</small></div>
            <button className="logout-button" onClick={signOut} title="Cerrar sesión"><LogOut size={17}/></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div><div className="eyebrow">STOCKVISION / OPERACIONES</div><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="topbar-right"><span className="live-indicator"><i/> Sesión activa</span><div className="top-avatar">{(profile?.nombre||profile?.email||"U").slice(0,1).toUpperCase()}</div></div>
        </header>
        <div className="page-content">{children}</div>
        <footer className="footer">StockVision 3D <span>·</span> Gestión de inventario tecnológico</footer>
      </main>
    </div>
  );
}
