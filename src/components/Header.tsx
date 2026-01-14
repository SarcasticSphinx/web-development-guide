"use client";

import { IconMenu2, IconMoon, IconSearch, IconSun } from "@tabler/icons-react";

interface HeaderProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onSidebarToggle: () => void;
  onSearchOpen: () => void;
}

export function Header({
  theme,
  onThemeToggle,
  onSidebarToggle,
  onSearchOpen,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={onSidebarToggle}
            aria-label="Toggle sidebar"
          >
            <IconMenu2 size={24} />
          </button>
          <div className="font-semibold text-lg tracking-tight">
            Development<span style={{ color: "var(--color-info)" }}> Docs</span>
          </div>
        </div>

        <div className="header-right">
          <button
            className="icon-button lg:hidden"
            onClick={onSearchOpen}
            aria-label="Search"
          >
            <IconSearch size={20} />
          </button>

          <div className="relative hidden lg:block">
            <IconSearch size={16} className="search-icon" />
            <button
              onClick={onSearchOpen}
              className="search-input"
              style={{
                display: "flex",
                alignItems: "center",
                textAlign: "left",
                width: "240px",
                height: "36px",
                paddingLeft: "36px",
                cursor: "pointer",
              }}
            >
              <span style={{ color: "var(--color-text-muted)" }}>
                Search...
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "12px",
                  opacity: 0.7,
                  color: "var(--color-text-muted)",
                }}
              >
                ⌘K
              </span>
            </button>
          </div>

          <button
            className="icon-button"
            onClick={onThemeToggle}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <IconMoon size={20} /> : <IconSun size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
