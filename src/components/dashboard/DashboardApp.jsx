import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
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
  const { applications: pinnedApplications, loading } = usePinnedApplications();
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
      ? window.matchMedia("(min-width: 1200px)").matches
      : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1200px)");
    const fn = (e) => setWide(e.matches);
    mq.addEventListener?.("change", fn);
    setWide(mq.matches);
    return () => mq.removeEventListener?.("change", fn);
  }, []);

  // seed pinned apps
  useEffect(() => {
    if (!loading && pinnedApplications.length > 0) {
      setSelectedApplications(pinnedApplications);
    }
  }, [loading, pinnedApplications]);

  // active app
  const activeApplication =
    selectedApplications.find((c) => c.id === activeApplicationId) || null;

  // Debug logging to help identify the issue
  useEffect(() => {
    if (activeApplication) {
      console.log("DashboardApp Debug - Active Application:", {
        id: activeApplication.id,
        title: activeApplication.title,
        steps: activeApplication.steps,
        hasSteps: Array.isArray(activeApplication.steps),
        stepsLength: activeApplication.steps?.length || 0,
      });
    }
  }, [activeApplication]);

  // progress
  const { completedSteps, markStepComplete, markStepIncomplete } = useProgress(
    user?.uid,
    activeApplicationId
  );

  // progress for all applications (sidebar)
  const applicationIds = useMemo(() => 
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
  const steps = useMemo(() => {
    const raw = activeApplication?.steps || [];
    return raw.map((s, idx) => ({
      ...s,
      _id: s.id ?? String(idx),
      title: s.title ?? `Step ${idx + 1}`,
      // only support explicit types
      type: s.type ?? "unknown",
    }));
  }, [activeApplication]);
  const firstStepId = steps[0]?._id || null;

  // progress/comments
  useEffect(() => {
    if (!user || !activeApplicationId) {
      setEnrichedApplication(null);
      return;
    }
    const base = selectedApplications.find((a) => a.id === activeApplicationId);
    if (!base) return;

    const unsub1 = onSnapshot(
      doc(db, "users", user.uid, "applicationProgress", base.id),
      (snap) => {
        const completedStepIds = snap.exists()
          ? snap.data().completedStepIds || []
          : [];
        setEnrichedApplication((prev) => ({
          ...(prev || base),
          completedStepIds,
        }));
      }
    );
    const unsub2 = onSnapshot(
      collection(db, "applications", base.id, "comments"),
      (snap) => {
        const comments = snap.docs.map((doc) => doc.data());
        setEnrichedApplication((prev) => ({ ...(prev || base), comments }));
      }
    );
    setEnrichedApplication(base);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user, activeApplicationId, selectedApplications]);

  // ensure first step when entering Steps
  useEffect(() => {
    if (activeSection === "steps" && !currentStepId && firstStepId) {
      setCurrentStepId(firstStepId);
    }
  }, [activeSection, currentStepId, firstStepId]);

  // handlers
  const handleApplicationSelect = (application) => {
    if (!selectedApplications.find((c) => c.id === application.id)) {
      setSelectedApplications((prev) => [...prev, application]);
    }
    setActiveApplicationId(application.id);
    setActiveSection("overview");
    setCurrentStepId(null);
    pinApplication(user?.uid, application.id);
  };
  const handleApplicationSwitch = (applicationId) => {
    setActiveApplicationId(applicationId);
    setActiveSection("overview");
    setCurrentStepId(null);
  };
  const handleApplicationRemove = (applicationId) => {
    const updated = selectedApplications.filter((c) => c.id !== applicationId);
    setSelectedApplications(updated);
    if (activeApplicationId === applicationId) {
      setActiveApplicationId(updated[0]?.id ?? null);
      setActiveSection("overview");
      setCurrentStepId(null);
    }
    unpinApplication(user?.uid, applicationId);
  };
  const onStepSelect = (id) => {
    setActiveSection("steps");
    setCurrentStepId(id);
  };

  // Find the first incomplete step for continuing applications
  const getFirstIncompleteStepId = () => {
    if (!steps.length) return null;

    console.log("Finding first incomplete step:", {
      totalSteps: steps.length,
      completedSteps,
      steps: steps.map(s => ({ id: s.id, _id: s._id, title: s.title }))
    });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = step.id || step._id || String(i);
      if (!completedSteps.includes(stepId)) {
        console.log(`First incomplete step found: Step ${i + 1} (${stepId})`);
        return stepId;
      }
    }

    // If all steps are completed, return the first step
    console.log("All steps completed, returning first step");
    return firstStepId;
  };

  // top bar (back + crumbs)
  const BreadcrumbBar = () => {
    if (!selectedApplications.length) return null;
    const showBack = Boolean(activeApplicationId);
    const crumbs = activeApplication
      ? `Home > ${activeApplication.title}${activeSection !== "overview" ? ` > ${activeSection}` : ""
      }`
      : "Home";
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {showBack && (
            <button
              onClick={() => {
                setActiveApplicationId(null);
                setActiveSection("overview");
                setCurrentStepId(null);
              }}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #e2e2e2",
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
              aria-label="Back to Application Grid"
              title="Back to Application Grid"
            >
              ← Back
            </button>
          )}
          <div style={{ fontSize: 14, color: "#666" }}>{crumbs}</div>
        </div>
      </div>
    );
  };

  // helpers
  const stepIndex = steps.findIndex((s) => s._id === currentStepId);
  const total = steps.length;
  const pct = total ? Math.round(((stepIndex + 1) / total) * 100) : 0;
  const canPrev = stepIndex > 0;
  const canNext = stepIndex < total - 1;

  const goPrev = () => canPrev && setCurrentStepId(steps[stepIndex - 1]._id);
  const goNext = () => canNext && setCurrentStepId(steps[stepIndex + 1]._id);

  const currentStep = stepIndex >= 0 ? steps[stepIndex] : null;
  const stepIsComplete = currentStep
    ? completedSteps.includes(currentStep.id || currentStep._id)
    : false;

  // NEW: StepNavigator (replaces StepHeader)
  const StepNavigator = () => {
    if (activeSection !== "steps" || !currentStep) return null;

    const toggleComplete = () => {
      const id = currentStep.id || currentStep._id;
      stepIsComplete ? markStepIncomplete(id) : markStepComplete(id);
    };

    return (
      <div
        style={{
          display: "grid",
          gap: 8,
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={goPrev}
            disabled={!canPrev}
            title="Previous step"
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: canPrev ? "pointer" : "not-allowed",
              opacity: canPrev ? 1 : 0.5,
              flexShrink: 0,
            }}
          >
            ←
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Step {stepIndex + 1} of {total}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: canNext ? "pointer" : "not-allowed",
              opacity: canNext ? 1 : 0.5,
              flexShrink: 0,
            }}
          >
            →
          </button>

          <button
            onClick={toggleComplete}
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: stepIsComplete ? "#10b981" : "#fff",
              color: stepIsComplete ? "#fff" : "#374151",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {stepIsComplete ? "✓ Complete" : "Mark Complete"}
          </button>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: 4,
            background: "#e5e7eb",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "#10b981",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    );
  };

  const StepContent = () => {
    if (activeSection !== "steps") return null;
    const step = steps.find((s) => s._id === currentStepId);
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
            display: "grid",
            gap: 8,
            width: "100%",
            minWidth: 0,
            overflow: "hidden",
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
  const handleCommentRequest = (request) => {
    if (request.type === "ai_chat") {
      // Set the AI chat context but keep the current section
      // AI chat is always available in the right panel or below main content
      setAiChatContext({
        subStepText: request.subStepText,
        stepId: request.stepId,
        applicationId: request.applicationId,
      });
      // Don't change activeSection - keep user on current view
      console.log("AI Chat requested for sub-step:", request.subStepText);
    } else if (request.type === "comment") {
      // Switch to comments section and create a comment about the sub-step
      setAiChatContext({
        subStepText: request.subStepText,
        stepId: request.stepId,
        applicationId: request.applicationId,
      });
      setActiveSection("comments");
      console.log("Comment requested for sub-step:", request.subStepText);
    }
  };

  // Clear context when switching sections manually
  const handleSectionChange = (newSection) => {
    if (newSection !== activeSection) {
      setAiChatContext(null); // Clear context when manually switching sections
      setActiveSection(newSection);
    }
  };

  const MobileTabs = () => {
    if (!activeApplication || wide) return null; // only show on smaller screens
    const tab = (key, label) => (
      <button
        key={key}
        onClick={() => handleSectionChange(key)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: activeSection === key ? "#eef" : "#fff",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        {label}
      </button>
    );
    return (
      <div style={{ display: "flex", gap: 8, margin: "8px 0 12px" }}>
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
            flex: 1,
            display: "grid",
            gridTemplateColumns:
              activeApplication && wide ? "1fr 380px" : "1fr",
            gap: 16,
            // ensure the grid itself is tall enough to make the aside fill
            minHeight: "calc(100vh - 90px)",
          }}
        >
          {/* Main content */}
          <main
            className="main-content"
            style={{ minWidth: 0, width: "100%", overflow: "auto" }}
          >
            <BreadcrumbBar />

            {selectedApplications.length === 0 || !activeApplication ? (
              <ApplicationCardGrid
                onApplicationSelect={handleApplicationSelect}
              />
            ) : (
              <>
                <MobileTabs />

                {activeSection === "overview" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <ApplicationOverview application={activeApplication} />
                    {steps.length > 0 && (
                      <button
                        onClick={() => {
                          setActiveSection("steps");
                          // If continuing, go to first incomplete step; if starting, go to first step
                          const targetStepId = completedSteps.length > 0
                            ? getFirstIncompleteStepId()
                            : firstStepId;
                          setCurrentStepId(targetStepId);
                        }}
                        style={{
                          padding: "10px 14px",
                          border: "1px solid #ccc",
                          borderRadius: 8,
                          width: "fit-content",
                          background: "#f7f7f7",
                          cursor: "pointer",
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
                      display: "grid",
                      gap: 12,
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    <StepNavigator />
                    <div
                      style={{
                        minHeight: 200,
                        width: "100%",
                        minWidth: 0,
                        overflow: "auto",
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
                      marginTop: 16,
                      border: "1px solid #eee",
                      borderRadius: 12,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        height: 420,
                        overflow: "auto",
                        padding: 8,
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
                borderLeft: "1px solid #eee",
                paddingLeft: 12,
                position: "sticky",
                // Full height column
                height: "calc(100vh - 90px)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "transparent",
                minHeight: 0, // allow inside scroll
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#30343a",
                }}
              >
                Your AI Assistant
              </div>

              {/* Chat card that truly fills and scrolls */}
              <div
                style={{
                  border: "1px solid #e8e8e8",
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  flex: 1, // fill column
                  minHeight: 0, // enable child overflow
                  display: "flex",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto", // internal scroll
                    padding: 8,
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
