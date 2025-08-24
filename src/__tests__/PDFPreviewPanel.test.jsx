import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PDFPreviewPanel from "../components/applications/PDFPreviewPanel";

// Mock fetch globally
global.fetch = vi.fn();
global.URL.createObjectURL = vi.fn(() => "mocked-url");
global.URL.revokeObjectURL = vi.fn();

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  strokeStyle: "",
  lineWidth: 1,
  fillStyle: "",
  shadowColor: "",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

// Mock canvas element
Object.defineProperty(global.HTMLCanvasElement.prototype, "getContext", {
  value: () => mockContext,
});

Object.defineProperty(global.HTMLCanvasElement.prototype, "width", {
  writable: true,
  value: 400,
});

Object.defineProperty(global.HTMLCanvasElement.prototype, "height", {
  writable: true,
  value: 600,
});

describe("PDFPreviewPanel", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentFieldId: null,
    formOverlay: { fields: [] },
    appId: "test-app",
    formId: "test-form",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful fetch responses
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        pages: 1,
        pointsWidth: 612,
        pointsHeight: 792,
        pixelWidth: 1224,
        pixelHeight: 1584,
        dpi: 144,
      }),
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(["fake-image-data"], { type: "image/png" }),
    });
  });

  it("renders when open", () => {
    render(<PDFPreviewPanel {...defaultProps} />);

    expect(screen.getByText("PDF Preview")).toBeDefined();
    expect(screen.getByText("Form Field Highlighting")).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<PDFPreviewPanel {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("PDF Preview")).toBeNull();
  });

  it("shows loading state initially", () => {
    render(<PDFPreviewPanel {...defaultProps} />);

    expect(screen.getByText("Loading PDF page...")).toBeDefined();
  });

  it("displays current field information", () => {
    render(<PDFPreviewPanel {...defaultProps} currentFieldId="test-field" />);

    expect(screen.getByText("Current Field: test-field")).toBeDefined();
  });

  it("shows page navigation controls", () => {
    render(<PDFPreviewPanel {...defaultProps} />);

    expect(screen.getByText("Page 1 of 1")).toBeDefined();
  });

  it("shows zoom controls", () => {
    render(<PDFPreviewPanel {...defaultProps} />);

    expect(screen.getByText("100%")).toBeDefined();
  });
});
