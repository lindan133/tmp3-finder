import type { PathCheckResult } from "./types";
import { useI18n } from "./i18n/context";
import { APP_NAME } from "./version";

export function Onboarding({
  pathInput,
  pathCheck,
  onPathInput,
  onBrowse,
  onUseDefaultPath,
  onComplete,
  loading,
}: {
  pathInput: string;
  pathCheck: PathCheckResult | null;
  onPathInput: (value: string) => void;
  onBrowse: () => void;
  onUseDefaultPath: () => void;
  onComplete: () => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  const canContinue = Boolean(pathCheck?.ok) && !loading;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-card">
        <p className="onboarding-kicker">{APP_NAME}</p>
        <h2 className="onboarding-title">{t("onboardingWelcome")}</h2>
        <p className="onboarding-text">{t("onboardingDescription")}</p>

        <label className="onboarding-label">{t("contentPath")}</label>
        <div className="path-row">
          <input
            value={pathInput}
            onChange={(e) => onPathInput(e.target.value)}
            placeholder={t("onboardingPathPlaceholder")}
          />
          <button type="button" className="btn btn-secondary" onClick={onBrowse}>
            {t("browse")}
          </button>
        </div>

        {pathCheck && (
          <ul className="path-check">
            {pathCheck.ok ? (
              <li>{t("pathRequiredOk")}</li>
            ) : pathCheck.missingRequired.length > 0 ? (
              <li>
                {t("pathMissing", {
                  files: pathCheck.missingRequired.join(", "),
                })}
              </li>
            ) : (
              <li>{t("onboardingPathInvalid")}</li>
            )}
          </ul>
        )}

        <div className="onboarding-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onUseDefaultPath}
          >
            {t("bestSteamPath")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canContinue}
            onClick={onComplete}
          >
            {loading ? t("loading") : t("onboardingContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}
