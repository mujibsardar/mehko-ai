import "./NavHeader.scss";
import { useUtils } from "/src/helpers/utils.js";
import { useData } from "/src/providers/DataProvider.jsx";

function NavHeader({ shrink }) {
  const utils = useUtils();
  const { getSettings } = useData();

  const settings = getSettings();
  const profile = settings.profile || {};
  const stylizedName = utils.parseJsonText(profile.stylizedName || "");
  const role = profile.role || "Home-Based Business";
  const pfpUrl = utils.resolvePath(profile.profilePictureUrl || "");
  const logoUrl = utils.resolvePath(profile.logoUrl || "");

  const status = settings.status || {};
  const statusVisible = status.visible;
  const statusAvailable = status.available;
  const statusMessage = status.message || "Now accepting applications";

  return (
    <header className={`nav-header ${shrink ? "nav-header-shrink" : ""}`}>
      <ImageView src={pfpUrl} className={`img-view-avatar`} alt={"profile"} />

      {statusVisible && (
        <StatusBadge
          available={statusAvailable}
          message={statusMessage}
          smallMode={shrink}
        />
      )}

      <div className={`info mt-3 text-center`}>
        <h5 className={`name`}>
          <ImageView
            src={logoUrl}
            alt={`logo`}
            className={`img-view-logo me-1`}
          />
          <span dangerouslySetInnerHTML={{ __html: stylizedName }} />
        </h5>

        <div className={`role`}>
          <span>{role}</span>
        </div>
      </div>
    </header>
  );
}

export default NavHeader;
