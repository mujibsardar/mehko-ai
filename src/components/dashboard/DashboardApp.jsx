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
  // data
  const { applications: pinnedApplications, loading } = usePinnedApplications();
  const { user } = useAuth();

  // ui state
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [activeApplicationId, setActiveApplicationId] = useState(null);
  const [activeSection, setActiveSection] = useState("overview"); // 'overview' | 'steps' | 'ai' | 'comments'
  const [currentStepId, setCurrentStepId] = useState(null);
  const [enrichedApplication, setEnrichedApplication] = useState(null);

  // seed pinned apps
  useEffect(() => {
    if (!loading && pinnedApplications.length > 0) {
      setSelectedApplications(pinnedApplications);
    }
  }, [loading, pinnedApplications]);

  // find active app
  const activeApplication = useMemo(
    () =>
      selectedApplications.find((c) => c.id === activeApplicationId) || null,
    [selectedApplications, activeApplicationId]
  );

  // normalize steps
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

  // enrich app (progress + comments)
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

  // when entering Steps, ensure a step is focused
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

  // sub-nav (single row, no duplication)
  const SubNav = () => {
    if (!activeApplication) return null;
    const tab = (key, label) => (
      <button
        key={key}
        onClick={() => setActiveSection(key)}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: activeSection === key ? "#eef" : "#fff",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
    return (
      <div style={{ display: "flex", gap: 8, margin: "8px 0 12px" }}>
        {tab("overview", "Overview")}
        {tab("steps", "Steps")}
        {tab("ai", "AI Assistant")}
        {tab("comments", "Comments")}
      </div>
    );
  };

  // left list only inside Steps
  const StepsList = () => {
    if (activeSection !== "steps" || steps.length === 0) return null;
    return (
      <div style={{ display: "grid", gap: 6 }}>
        {steps.map((s) => {
          const selected = currentStepId === s._id;
          const done = enrichedApplication?.completedStepIds?.includes(
            s.id || s._id
          );
          return (
            <button
              key={s._id}
              onClick={() => setCurrentStepId(s._id)}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: selected ? "#eef" : "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{s.title}</span>
              {done && (
                <span style={{ color: "#2a7", fontWeight: 600 }}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // render a single step
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

  return (
    <>
      <Header />
      <div className="app-wrapper">
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

        <main className="main-content">
          {/* Breadcrumb + back */}
          {activeApplication && (
            <div style={{ marginBottom: 8, fontSize: 14, color: "#666" }}>
              Home &gt; {activeApplication.title}
              {activeSection !== "overview" && ` > ${activeSection}`}
            </div>
          )}
          {selectedApplications.length > 0 && activeApplicationId && (
            <button
              style={{
                margin: "0 0 12px",
                padding: "8px 12px",
                border: "1px solid #bbb",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer",
              }}
              onClick={() => {
                setActiveApplicationId(null);
                setActiveSection("overview");
                setCurrentStepId(null);
              }}
            >
              ← Back to Application Grid
            </button>
          )}

          {/* Grid vs App */}
          {selectedApplications.length === 0 || !activeApplication ? (
            <ApplicationCardGrid
              onApplicationSelect={handleApplicationSelect}
            />
          ) : (
            <>
              <SubNav />

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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "260px 1fr",
                    gap: 16,
                    alignItems: "start",
                  }}
                >
                  <StepsList />
                  <div style={{ minHeight: 200 }}>
                    <StepContent />
                  </div>
                </div>
              )}

              {activeSection === "ai" && enrichedApplication && (
                <AIChat application={enrichedApplication} />
              )}

              {activeSection === "comments" && (
                <CommentsSection application={activeApplication} />
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
