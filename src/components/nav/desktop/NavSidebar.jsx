import "./NavSidebar.scss";
import { useEffect, useState } from "react";
import { useUtils } from "/src/helpers/utils.js";
import { useData } from "/src/providers/DataProvider.jsx";
import { useWindow } from "/src/providers/WindowProvider.jsx";
import { useGlobalState } from "/src/providers/GlobalStateProvider.jsx";



function NavSidebar() {
  const utils = useUtils();
  const [shrinkSelected, setShrinkSelected] = useState(false);
  const [canExpand, setCanExpand] = useState(true);
  const { getSections } = useData();
  const { isBreakpoint } = useWindow();

  const sections = getSections();
  const shouldShrink = shrinkSelected || !canExpand;

  useEffect(() => {
    setCanExpand(isBreakpoint("lg"));
  }, [isBreakpoint("lg")]);

  const _toggle = () => {
    setShrinkSelected(!shrinkSelected);
  };

  return (
    <Box
      nav
      className={`sidebar highlight-scrollbar ${utils.strIf(
        shouldShrink,
        "sidebar-shrink"
      )}`}
    >
      {canExpand && (
        <ToolButton
          className={`btn-toggle`}
          icon={
            shouldShrink ? "fa-solid fa-caret-right" : "fa-solid fa-caret-left"
          }
          size={shouldShrink ? 1 : 2}
          tooltip={"Toggle Sidebar"}
          onClick={_toggle}
        />
      )}

      <div className={`sidebar-content d-flex h-100 flex-column`}>
        <NavHeader shrink={shouldShrink} />
        {isBreakpoint("md") && (
          <NavSidebarLinks shouldShrink={shouldShrink} sections={sections} />
        )}
      </div>
    </Box>
  );
}

function _NavSidebarLinks({ shouldShrink, sections }) {
  const { isSectionActive, setActiveSection } = useGlobalState();
  const [selectedItemSectionId, setSelectedItemSectionId] = useState(null);

  const _isActive = (section) => {
    if (selectedItemSectionId) return section.id === selectedItemSectionId;
    return isSectionActive(section.id);
  };

  const _setActive = (section) => {
    if (selectedItemSectionId) return;
    setSelectedItemSectionId(section.id);
    setTimeout(() => setActiveSection(section.id), 60);
    setTimeout(() => setSelectedItemSectionId(null), 100);
  };

  return (
    <NavSidebarGroup
      direction="vertical"
      shrink={shouldShrink}
      className="mt-3"
      fillSpace
    >
      {sections.map((section, key) => (
        <NavSidebarGroupItem key={key} visible>
          <NavLink
            shrink={shouldShrink}
            label={section.title || section.id}
            icon={section.faIcon}
            size={1}
            className="px-4"
            disabled={_isActive(section)}
            selected={_isActive(section)}
            onClick={() => _setActive(section)}
          />
        </NavSidebarGroupItem>
      ))}
    </NavSidebarGroup>
  );
}

export default NavSidebar;
