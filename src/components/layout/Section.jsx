import "./Section.scss";
import { useEffect, useState } from "react";
import { useGlobalState } from "/src/providers/GlobalStateProvider.jsx";
import { useUtils } from "/src/helpers/utils.js";
import { useData } from "/src/providers/DataProvider.jsx";
import { useWindow } from "/src/providers/WindowProvider.jsx";
import { useScheduler } from "/src/helpers/scheduler.js";

import ArticleCards from "/src/components/articles/ArticleCards.jsx";
import ArticleContactForm from "/src/components/articles/ArticleContactForm.jsx";
import ArticleGrid from "/src/components/articles/ArticleGrid.jsx";
import ArticleInfoBlock from "/src/components/articles/ArticleInfoBlock.jsx";
import ArticleList from "/src/components/articles/ArticleList.jsx";
import ArticlePortfolio from "/src/components/articles/ArticlePortfolio.jsx";
import ArticleServices from "/src/components/articles/ArticleServices.jsx";
import ArticleTestimonials from "/src/components/articles/ArticleTestimonials.jsx";
import ArticleThread from "/src/components/articles/ArticleThread.jsx";
import ArticleTimeline from "/src/components/articles/ArticleTimeline.jsx";

const TransitionClasses = {
  HIDDEN: "section-transition-hidden",
  HIDING: "section-transition-hiding",
  SHOWING: "section-transition-showing",
  SHOWN: "section-transition-shown",
  FORCE_SHOW: "section-transition-show-without-transition",
};

const ARTICLES = {
  ArticleCards,
  ArticleContactForm,
  ArticleGrid,
  ArticleInfoBlock,
  ArticleList,
  ArticlePortfolio,
  ArticleServices,
  ArticleTestimonials,
  ArticleThread,
  ArticleTimeline,
};

const utils = useUtils();
const scheduler = useScheduler();

function Section({ section }) {
  const { getSettings } = useData();
  const { isSectionActive, didRenderFirstSection, setDidRenderFirstSection } =
    useGlobalState();
  const { isBreakpoint, isMobileLayout } = useWindow();
  const [transitionClass, setTransitionClass] = useState(
    TransitionClasses.HIDDEN
  );

  const settings = getSettings();
  const scrollableEnabled = !isMobileLayout() && !utils.isTouchDevice();
  const articles = section.content?.articles || [];

  useEffect(() => {
    const isActive = isSectionActive(section.id);
    isActive ? _showSection() : _hideSection();
  }, [isSectionActive(section.id)]);

  const _showSection = () => {
    if (transitionClass === TransitionClasses.SHOWN) return;

    if (didRenderFirstSection) {
      setTransitionClass(TransitionClasses.SHOWING);
      scheduler.clearAllWithTag(`section-${section.id}`);
      _changeStateAfterTimeout(TransitionClasses.SHOWN, 30);
    } else {
      setDidRenderFirstSection(true);
      setTransitionClass(TransitionClasses.SHOWN);
    }
  };

  const _hideSection = () => {
    if (transitionClass === TransitionClasses.HIDDEN) return;

    setTransitionClass(TransitionClasses.FORCE_SHOW);
    scheduler.clearAllWithTag(`section-${section.id}`);
    _changeStateAfterTimeout(TransitionClasses.HIDING, 30);
    _changeStateAfterTimeout(TransitionClasses.HIDDEN, 1000);
  };

  const _changeStateAfterTimeout = (state, timeMs) => {
    scheduler.schedule(
      () => setTransitionClass(state),
      timeMs,
      `section-${section.id}`
    );
  };

  return (
    <>
      {transitionClass !== TransitionClasses.HIDDEN && (
        <Box
          className={`lead-section ${transitionClass}`}
          opaque
          id={`lead-section-${section.id}`}
        >
          <div className="lead-section-content">
            {settings.fullScreenButtonEnabled &&
              !utils.isIOS() &&
              !isMobileLayout() &&
              !utils.isSafari() && (
                <div
                  className={`full-screen-toggle-wrapper ${
                    isBreakpoint("lg")
                      ? "full-screen-toggle-wrapper-top-right"
                      : "full-screen-toggle-wrapper-top-left"
                  }`}
                >
                  <FullScreenToggleButton
                    enabled
                    className="fullscreen-toggle"
                  />
                </div>
              )}

            <Scrollable
              id={`scrollable-${section.id}`}
              scrollActive={transitionClass === TransitionClasses.SHOWN}
              scrollEnabled={
                transitionClass !== TransitionClasses.HIDDEN &&
                scrollableEnabled
              }
            >
              <BorderWrap>
                <section className="w-100">
                  <SectionHeader section={section} />
                  <SectionContent articles={articles} />
                </section>
              </BorderWrap>
            </Scrollable>
          </div>
        </Box>
      )}
    </>
  );
}

function _SectionHeader({ section }) {
  const { isBreakpoint } = useWindow();
  const title = section.title || section.id;
  const prefix = section.titlePrefix || null;

  return (
    <div
      className={`section-header w-100 px-0 px-md-3 text-center ${
        prefix ? `mt-0` : `mt-1 mt-sm-2 mt-lg-4`
      }`}
    >
      {prefix && (
        <div className="fw-bold text-muted lead-2 font-family-headings mb-2">
          <FaIcon className="me-2 opacity-50" iconName="fa-solid fa-cubes" />
          <span>{prefix}</span>
        </div>
      )}

      <h3 className={`fw-bold ${isBreakpoint("lg") ? "lead-4" : ""} mx-4 mb-0`}>
        <span className="text-highlight">{title}</span>
      </h3>
    </div>
  );
}

function _SectionContent({ articles }) {
  return (
    <div className="section-content">
      {articles.map((article, key) => {
        const Component = ARTICLES[article.component];
        const mtClass = article.config?.ignorePaddingTop
          ? "mt-4"
          : "mt-4 pt-1 pt-md-3";

        return (
          <div className={`article-wrapper ${mtClass}`} key={key}>
            {Component ? (
              <Component data={article} />
            ) : (
              <div className="alert alert-danger text-3">
                Component <strong>{article.component}</strong> not found! Make
                sure the component exists and is listed in the <b>ARTICLES</b>{" "}
                dictionary.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Section;
