import React from "react";
import { NAV_ITEMS } from "../utils";
import { ActiveTab } from "../types";

/* ═══════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════ */
type SidebarProps = {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
};

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  return (
    <aside className="w-24 bg-gray-900 border-r border-gray-800 flex flex-col items-center pt-8">
      {NAV_ITEMS.map((item, index) => (
        <React.Fragment key={item.id}>
          <button
            onClick={() => onTabChange(item.id)}
            className={`relative flex flex-col items-center gap-2 w-20 py-4 rounded-xl transition ${
              activeTab === item.id ? "text-orange-400" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {item.icon}
            <span className="text-[11px]">{item.label}</span>
          </button>
          {index < NAV_ITEMS.length - 1 && (
            <div className="w-12 h-px bg-gray-700 my-3" />
          )}
        </React.Fragment>
      ))}
    </aside>
  );
};

export default Sidebar;