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

export default function DashboardApp() {
  const { applications: pinnedApplications, loading } = usePinnedApplications();
  const { user } = useAuth();

  // ui
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [activeApplicationId, setActiveApplicationId] = useState(null);
  const [activeSection, setActiveSection] = useState("overview"); // 'overview' | 'steps' | 'comments'
  const [currentStepId, setCurrentStepId] = useState(null);
  const [enrichedApplication, setEnrichedApplication] = useState(null);

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

  // steps
  const steps = useMemo(() => {
    const raw = activeApplication?.steps || [];
    return raw.map((s, idx) => ({
      ...s,
      _id: s.id ?? String(idx),
      title:
        s.title ??
        s.formName ??
        (s.content ? String(s.content).slice(0, 40) + "…" : `Step ${idx + 1}`),
      type: s.type ?? (s.formName ? "form" : s.content ? "info" : "unknown"),
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
  };
  const onStepSelect = (id) => {
    setActiveSection("steps");
    setCurrentStepId(id);
  };

  // top bar (back + crumbs)
  const BreadcrumbBar = () => {
    if (!selectedApplications.length) return null;
    const showBack = Boolean(activeApplicationId);
    const crumbs = activeApplication
      ? `Home > ${activeApplication.title}${
          activeSection !== "overview" ? ` > ${activeSection}` : ""
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

  const StepHeader = () => {
    if (activeSection !== "steps") return null;
    const idx = steps.findIndex((s) => s._id === currentStepId);
    if (idx === -1) return null;
    const step = steps[idx];
    const total = steps.length;
    const pct = Math.round(((idx + 1) / Math.max(total, 1)) * 100);
    return (
      <div
        style={{
          display: "grid",
          gap: 6,
          border: "1px solid #eee",
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 12,
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ fontSize: 14, color: "#666" }}>
          Step {idx + 1} of {total}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{step.title}</div>
        <div
          style={{
            height: 6,
            background: "#f2f2f2",
            borderRadius: 999,
            overflow: "hidden",
          }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{ width: `${pct}%`, height: "100%", background: "#5b9df9" }}
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
        />
      );
    }
    if (step.type === "info" || step.content) {
      return <InfoStep step={step} applicationId={activeApplication.id} />;
    }
    if (step.type === "pdf") {
      return (
        <div style={{ display: "grid", gap: 8 }}>
          <p>Fill and download the official form.</p>
          <Link
            to={`/interview/${step.appId || activeApplication.id}/${
              step.formId || "page1"
            }`}
          >
            <button
              style={{
                padding: "10px 14px",
                border: "1px solid #ccc",
                borderRadius: 8,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              Open Form
            </button>
          </Link>
        </div>
      );
    }
    return <p>Unsupported step type.</p>;
  };

  const MobileTabs = () => {
    if (!activeApplication || wide) return null; // only show on smaller screens
    const tab = (key, label) => (
      <button
        key={key}
        onClick={() => setActiveSection(key)}
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
          setActiveSection={setActiveSection}
          onSelect={handleApplicationSwitch}
          onStepSelect={onStepSelect}
          selectedStepId={currentStepId}
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
          <main className="main-content" style={{ minWidth: 0 }}>
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
                          setCurrentStepId(firstStepId);
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
                        Start application →
                      </button>
                    )}
                  </div>
                )}

                {activeSection === "steps" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <StepHeader />
                    <div style={{ minHeight: 200 }}>
                      <StepContent />
                    </div>
                  </div>
                )}

                {activeSection === "comments" && activeApplication && (
                  <CommentsSection application={activeApplication} />
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
                top: 70,
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
