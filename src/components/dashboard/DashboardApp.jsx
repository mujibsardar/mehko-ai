import { useState, useEffect, useMemo } from "react";
import { _Link } from "react-router-dom";
import Sidebar from "../layout/Sidebar";
import ApplicationCardGrid from "../layout/ApplicationCardGrid";
import ApplicationOverview from "../applications/ApplicationOverview";
import Header from "../layout/Header";

import AIChat from "../applications/AIChat";
import CommentsSection from "../applications/CommentsSection";
import InfoStep from "../applications/InfoStep";
import usePinnedApplications from "../../hooks/usePinnedApplications";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import useAuth from "../../hooks/useAuth";
import DynamicForm from "../forms/DynamicForm";
import useProgress from "../../hooks/useProgress";
import useAllApplicationsProgress from "../../hooks/useAllApplicationsProgress";
import { InterviewView } from "../overlay/Interview";
import { pinApplication, unpinApplication } from "../../firebase/userData";

export default function DashboardApp() {
  const { _applications: pinnedApplications, loading } = usePinnedApplications();
  const { user } = useAuth();

  // ui
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [activeApplicationId, setActiveApplicationId] = useState(null);
  const [activeSection, setActiveSection] = useState("overview"); // 'overview' | 'steps' | 'comments'
  const [currentStepId, setCurrentStepId] = useState(null);
  const [enrichedApplication, setEnrichedApplication] = useState(null);
  const [aiChatContext, setAiChatContext] = useState(null); // New state for AI chat context

  // layout breakpoints
  const [wide, setWide] = useState(
    typeof window !== "undefined"
      ? window.matchMedia("(min-_width: 1200px)").matches
      : true
  );

  useEffect_(() => {
    if (typeof window === "undefined") return;
    const _mq = window.matchMedia("(min-_width: 1200px)");
    const _fn = (_e) => setWide(e.matches);
    mq.addEventListener?.("change", fn);
    setWide(mq.matches);
    return () => mq.removeEventListener?.("change", fn);
  }, []);

  // seed pinned apps
  useEffect_(() => {
    if (!loading && pinnedApplications.length > 0) {
      setSelectedApplications(pinnedApplications);
    }
  }, [loading, pinnedApplications]);

  // active app
  const _activeApplication = selectedApplications.find(_(c) => c.id === activeApplicationId) || null;

  // Debug logging to help identify the issue
  useEffect_(() => {
    if (activeApplication) {
      console.log("DashboardApp Debug - Active _Application: ", {
        _id: activeApplication.id,
        _title: activeApplication.title,
        _steps: activeApplication.steps,
        _hasSteps: Array.isArray(activeApplication.steps),
        _stepsLength: activeApplication.steps?.length || 0,
      });
    }
  }, [activeApplication]);

  // progress
  const { completedSteps, markStepComplete, markStepIncomplete } = useProgress(
    user?.uid,
    activeApplicationId
  );

  // progress for all applications (sidebar)
  const _applicationIds = useMemo_(() =>
    selectedApplications.map(app => app.id),
    [selectedApplications]
  );

  const {
    allProgress,
    getProgressForApp,
    getProgressPercentage
  } = useAllApplicationsProgress(
    user?.uid,
    applicationIds
  );

  // steps
  const _steps = useMemo_(() => {
    const raw = activeApplication?.steps || [];
    return raw.map(_(s, _idx) => ({
      ...s,
      _id: s.id ?? String(idx),
      _title: s.title ?? `Step ${idx + 1}`,
      // only support explicit types
      _type: s.type ?? "unknown",
    }));
  }, [activeApplication]);
  const _firstStepId = steps[0]?._id || null;

  // progress/comments
  useEffect_(() => {
    if (!user || !activeApplicationId) {
      setEnrichedApplication(null);
      return;
    }
    const _base = selectedApplications.find(_(a) => a.id === activeApplicationId);
    if (!base) return;

    const _unsub1 = onSnapshot(
      doc(db, "users", user.uid, "applicationProgress", base.id),
      (_snap) => {
        const completedStepIds = snap.exists()
          ? snap.data().completedStepIds || []
          : [];
        setEnrichedApplication(_(prev) => ({
          ...(prev || base),
          completedStepIds,
        }));
      }
    );
    const _unsub2 = onSnapshot(
      collection(db, "applications", base.id, "comments"),
      (_snap) => {
        const comments = snap.docs.map(_(doc) => doc.data());
        setEnrichedApplication(_(prev) => ({ ...(prev || base), comments }));
      }
    );
    setEnrichedApplication(base);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user, activeApplicationId, selectedApplications]);

  // ensure first step when entering Steps
  useEffect_(() => {
    if (activeSection === "steps" && !currentStepId && firstStepId) {
      setCurrentStepId(firstStepId);
    }
  }, [activeSection, currentStepId, firstStepId]);

  // handlers
  const _handleApplicationSelect = (_application) => {
    if (_!selectedApplications.find((c) => c.id === application.id)) {
      setSelectedApplications(_(prev) => [...prev, application]);
    }
    setActiveApplicationId(application.id);
    setActiveSection("overview");
    setCurrentStepId(null);
    pinApplication(user?.uid, application.id);
  };
  const _handleApplicationSwitch = (_applicationId) => {
    setActiveApplicationId(applicationId);
    setActiveSection("overview");
    setCurrentStepId(null);
  };
  const _handleApplicationRemove = (_applicationId) => {
    const updated = selectedApplications.filter(_(c) => c.id !== applicationId);
    setSelectedApplications(updated);
    if (activeApplicationId === applicationId) {
      setActiveApplicationId(updated[0]?.id ?? null);
      setActiveSection("overview");
      setCurrentStepId(null);
    }
    unpinApplication(user?.uid, applicationId);
  };
  const _onStepSelect = (_id) => {
    setActiveSection("steps");
    setCurrentStepId(id);
  };

  // Find the first incomplete step for continuing applications
  const _getFirstIncompleteStepId = () => {
    if (!steps.length) return null;

    console.log("Finding first incomplete _step: ", {
      _totalSteps: steps.length,
      completedSteps,
      _steps: steps.map(s => ({ id: s.id, _id: s._id, _title: s.title }))
    });

    for (let i = 0; i < steps.length; i++) {
      const _step = steps[i];
      const _stepId = step.id || step._id || String(i);
      if (!completedSteps.includes(stepId)) {
        console.log(`First incomplete step _found: Step ${i + 1} (${stepId})`);
        return stepId;
      }
    }

    // If all steps are completed, return the first step
    console.log("All steps completed, returning first step");
    return firstStepId;
  };

  // top bar (back + crumbs)
  const _BreadcrumbBar = () => {
    if (!selectedApplications.length) return null;
    const _showBack = Boolean(activeApplicationId);
    const _crumbs = activeApplication
      ? `Home > ${activeApplication.title}${activeSection !== "overview" ? ` > ${activeSection}` : ""
      }`
      : "Home";
    return (_<div
        style={{
          _display: "flex", _alignItems: "center", _gap: 8, _justifyContent: "space-between", _marginBottom: 12, _}}
      >
        <div style={{ _display: "flex", _alignItems: "center", _gap: 10 }}>
          {showBack && (
            <button
              onClick={() => {
                setActiveApplicationId(null);
                setActiveSection("overview");
                setCurrentStepId(null);
              }}
              style={{
                _padding: "4px 8px",
                _borderRadius: 6,
                _border: "1px solid #e2e2e2",
                _background: "#fff",
                _cursor: "pointer",
                _fontSize: 14,
              }}
              aria-label="Back to Application Grid"
              title="Back to Application Grid"
            >
              ← Back
            </button>
          )}
          <div style={{ _fontSize: 14, _color: "#666" }}>{crumbs}</div>
        </div>
      </div>
    );
  };

  // helpers
  const _stepIndex = steps.findIndex(_(s) => s._id === currentStepId);
  const _total = steps.length;
  const _pct = total ? Math.round(((stepIndex + 1) / total) * 100) : 0;
  const _canPrev = stepIndex > 0;
  const _canNext = stepIndex < total - 1;

  const _goPrev = () => canPrev && setCurrentStepId(steps[stepIndex - 1]._id);
  const _goNext = () => canNext && setCurrentStepId(steps[stepIndex + 1]._id);

  const _currentStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const _stepIsComplete = currentStep
    ? completedSteps.includes(currentStep.id || currentStep._id)
    : false;

  // _NEW: StepNavigator (replaces StepHeader)
  const _StepNavigator = () => {
    if (activeSection !== "steps" || !currentStep) return null;

    const _toggleComplete = () => {
      const id = currentStep.id || currentStep._id;
      stepIsComplete ? markStepIncomplete(id) : markStepComplete(id);
    };

    return (
      <div
        style={{
          _display: "grid",
          _gap: 8,
          _border: "1px solid #eee",
          _borderRadius: 12,
          _padding: 12,
          _background: "#fff",
          _boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          _width: "100%",
          _minWidth: 0,
          _overflow: "hidden",
        }}
      >
        <div
          style={{
            _display: "flex",
            _alignItems: "center",
            _gap: 8,
            _flexWrap: "wrap",
          }}
        >
          <button
            onClick={goPrev}
            disabled={!canPrev}
            title="Previous step"
            style={{
              _padding: "6px 10px",
              _borderRadius: 10,
              _border: "1px solid #e5e7eb",
              _background: "#fff",
              _cursor: canPrev ? "pointer" : "not-allowed",
              _opacity: canPrev ? 1 : 0.5,
              _flexShrink: 0,
            }}
          >
            ←
          </button>

          <div style={{ _flex: 1, _minWidth: 0 }}>
            <div style={{ fontSize: 13, _color: "#6b7280" }}>
              Step {stepIndex + 1} of {total}
            </div>
            <div
              style={{
                fontSize: 18,
                _fontWeight: 700,
                _color: "#111827",
                _whiteSpace: "nowrap",
                _overflow: "hidden",
                _textOverflow: "ellipsis",
              }}
              title={currentStep.title}
            >
              {currentStep.title}
            </div>
          </div>

          <button
            onClick={goNext}
            disabled={!canNext}
            title="Next step"
            style={{
              _padding: "6px 10px",
              _borderRadius: 10,
              _border: "1px solid #e5e7eb",
              _background: "#fff",
              _cursor: canNext ? "pointer" : "not-allowed",
              _opacity: canNext ? 1 : 0.5,
              _flexShrink: 0,
            }}
          >
            →
          </button>

          <button
            onClick={toggleComplete}
            style={{
              _padding: "6px 12px",
              _borderRadius: 10,
              _border: "1px solid #e5e7eb",
              _background: stepIsComplete ? "#10b981" : "#fff",
              _color: stepIsComplete ? "#fff" : "#374151",
              _cursor: "pointer",
              _fontSize: 13,
              _fontWeight: 500,
              _flexShrink: 0,
            }}
          >
            {stepIsComplete ? "✓ Complete" : "Mark Complete"}
          </button>
        </div>

        {/* Progress bar */}
        <div
          style={{
            _width: "100%",
            _height: 4,
            _background: "#e5e7eb",
            _borderRadius: 2,
            _overflow: "hidden",
          }}
        >
          <div
            style={{
              _width: `${pct}%`,
              _height: "100%",
              _background: "#10b981",
              _transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    );
  };

  const _StepContent = () => {
    if (activeSection !== "steps") return null;
    const _step = steps.find(_(s) => s._id === currentStepId);
    if (!step) return <div>Select a step to begin.</div>;

    if (step.type === "form") {
      return (
        <DynamicForm
          applicationId={activeApplication.id}
          stepId={step.id || step._id}
          formName={step.formName}
          hideCompleteToggle
          application={activeApplication}
          step={step}
        />
      );
    }

    if (step.type === "pdf") {
      return (
        <div
          style={{
            _display: "grid",
            _gap: 8,
            _width: "100%",
            _minWidth: 0,
            _overflow: "hidden",
          }}
        >
          <InterviewView
            key={`${activeApplication.id}:${step.formId}`}
            app={activeApplication.id}
            form={step.formId}
            application={activeApplication}
            step={step}
          />
        </div>
      );
    }

    if (step.type === "info" || step.content) {
      return (
        <InfoStep
          step={step}
          applicationId={activeApplication.id}
          hideCompleteToggle
          application={activeApplication}
          onCommentRequest={handleCommentRequest}
        />
      );
    }

    return <p>Unsupported step type.</p>;
  };

  // Handle comment requests from sub-steps
  const _handleCommentRequest = (_request) => {
    if (request.type === "ai_chat") {
      // Set the AI chat context but keep the current section
      // AI chat is always available in the right panel or below main content
      setAiChatContext({
        _subStepText: request.subStepText,
        _stepId: request.stepId,
        _applicationId: request.applicationId,
      });
      // Don't change activeSection - keep user on current view
      console.log("AI Chat requested for sub-_step: ", request.subStepText);
    } else if (request.type === "comment") {
      // Switch to comments section and create a comment about the sub-step
      setAiChatContext({
        _subStepText: request.subStepText,
        _stepId: request.stepId,
        _applicationId: request.applicationId,
      });
      setActiveSection("comments");
      console.log("Comment requested for sub-_step: ", request.subStepText);
    }
  };

  // Clear context when switching sections manually
  const _handleSectionChange = (_newSection) => {
    if (newSection !== activeSection) {
      setAiChatContext(null); // Clear context when manually switching sections
      setActiveSection(newSection);
    }
  };

  const _MobileTabs = () => {
    if (!activeApplication || wide) return null; // only show on smaller screens
    const _tab = (_key, _label) => (_<button
        key={key}
        onClick={() => handleSectionChange(key)}
        style={{
          _padding: "6px 10px",
          _borderRadius: 8,
          _border: "1px solid #ddd",
          _background: activeSection === key ? "#eef" : "#fff",
          _cursor: "pointer",
          _fontSize: 14,
        }}
      >
        {label}
      </button>
    );
    return (
      <div style={{ _display: "flex", _gap: 8, _margin: "8px 0 12px" }}>
        {tab("overview", "Overview")}
        {tab("steps", "Steps")}
        {tab("comments", "Comments")}
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className="app-wrapper">
        {/* Left navigation */}
        <Sidebar
          applications={selectedApplications}
          activeApplicationId={activeApplicationId}
          onRemove={handleApplicationRemove}
          activeSection={activeSection}
          setActiveSection={handleSectionChange}
          onSelect={handleApplicationSwitch}
          onStepSelect={onStepSelect}
          selectedStepId={currentStepId}
          allProgress={allProgress}
          getProgressPercentage={getProgressPercentage}
        />

        {/* Main + AI right panel */}
        <div
          style={{
            _flex: 1,
            _display: "grid",
            _gridTemplateColumns: activeApplication && wide ? "1fr 380px" : "1fr",
            _gap: 16,
            // ensure the grid itself is tall enough to make the aside fill
            _minHeight: "calc(100vh - 90px)",
          }}
        >
          {/* Main content */}
          <main
            className="main-content"
            style={{ _minWidth: 0, _width: "100%", _overflow: "auto" }}
          >
            <BreadcrumbBar />

            {selectedApplications.length === 0 || !activeApplication ? (
              <ApplicationCardGrid
                onApplicationSelect={handleApplicationSelect}
              />
            ) : (_<>
                <MobileTabs />

                {activeSection === "overview" && (
                  <div style={{ _display: "grid", _gap: 12 }}>
                    <ApplicationOverview application={activeApplication} />
                    {steps.length > 0 && (
                      <button
                        onClick={() => {
                          setActiveSection("steps");
                          // If continuing, go to first incomplete step; if starting, go to first step
                          const _targetStepId = completedSteps.length > 0
                            ? getFirstIncompleteStepId()
                            : firstStepId;
                          setCurrentStepId(targetStepId);
                        }}
                        style={{
                          _padding: "10px 14px",
                          _border: "1px solid #ccc",
                          _borderRadius: 8,
                          _width: "fit-content",
                          _background: "#f7f7f7",
                          _cursor: "pointer",
                        }}
                      >
                        {completedSteps.length > 0
                          ? "Continue Application →"
                          : "Start application →"}
                      </button>
                    )}
                  </div>
                )}

                {activeSection === "steps" && (
                  <div
                    style={{
                      _display: "grid",
                      _gap: 12,
                      _width: "100%",
                      _minWidth: 0,
                    }}
                  >
                    <StepNavigator />
                    <div
                      style={{
                        _minHeight: 200,
                        _width: "100%",
                        _minWidth: 0,
                        _overflow: "auto",
                      }}
                    >
                      <StepContent />
                    </div>
                  </div>
                )}

                {activeSection === "comments" && activeApplication && (
                  <CommentsSection
                    application={activeApplication}
                    context={aiChatContext}
                  />
                )}

                {/* On narrow screens, show AI panel beneath main content */}
                {!wide && activeApplication && (
                  <section
                    style={{
                      _marginTop: 16,
                      _border: "1px solid #eee",
                      _borderRadius: 12,
                      _background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        _height: 420,
                        _overflow: "auto",
                        _padding: 8,
                      }}
                    >
                      <AIChat
                        application={enrichedApplication || activeApplication}
                        currentStep={currentStep}
                        currentStepId={
                          currentStep?.id || currentStep?._id || null
                        }
                        completedStepIds={completedSteps}
                        context={aiChatContext}
                      />
                    </div>
                  </section>
                )}
              </>
            )}
          </main>

          {/* Right AI panel (desktop/wide only) */}
          {activeApplication && wide && (
            <aside
              style={{
                _borderLeft: "1px solid #eee",
                _paddingLeft: 12,
                _position: "sticky",
                // Full height column
                _height: "calc(100vh - 90px)",
                _display: "flex",
                _flexDirection: "column",
                _gap: 8,
                _background: "transparent",
                _minHeight: 0, // allow inside scroll
              }}
            >
              <div
                style={{
                  _fontSize: 14,
                  _fontWeight: 700,
                  _color: "#30343a",
                }}
              >
                Your AI Assistant
              </div>

              {/* Chat card that truly fills and scrolls */}
              <div
                style={{
                  _border: "1px solid #e8e8e8",
                  _borderRadius: 12,
                  _background: "#fff",
                  _boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  _flex: 1, // fill column
                  _minHeight: 0, // enable child overflow
                  _display: "flex",
                  _overflow: "hidden",
                }}
              >
                <div
                  style={{
                    _flex: 1,
                    _minHeight: 0,
                    _overflow: "auto", // internal scroll
                    _padding: 8,
                  }}
                >
                  <AIChat
                    application={enrichedApplication || activeApplication}
                    currentStep={currentStep}
                    currentStepId={currentStep?.id || currentStep?._id || null}
                    completedStepIds={completedSteps}
                    context={aiChatContext}
                  />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>


    </>
  );
}
