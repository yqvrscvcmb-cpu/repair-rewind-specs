/**
 * Repair Rewind: explicit, in-memory user observations.
 * Pure logic only. No camera, network, persistence, or physical-correctness claim.
 * The Lens adapter must capture the original transform BEFORE moving a part.
 */
export type Point3 = { x: number; y: number; z: number };
export type Rotation = { x: number; y: number; z: number; w: number };
export type Pose = { position: Point3; rotation: Rotation };
export type RepairStep = {
  partId: string;
  label: string;
  sequence: number;
  origin: Pose;
};
export type SessionMode = "recording" | "rewinding" | "paused" | "complete";
export type SessionView = {
  mode: SessionMode;
  recordedCount: number;
  returnedCount: number;
  current: RepairStep | null;
  steps: RepairStep[];
};

function cloneStep(step: RepairStep): RepairStep {
  return {
    partId: step.partId,
    label: step.label,
    sequence: step.sequence,
    origin: {
      // Native Lens vectors may expose accessors rather than enumerable fields.
      position: {
        x: step.origin.position.x,
        y: step.origin.position.y,
        z: step.origin.position.z,
      },
      rotation: {
        x: step.origin.rotation.x,
        y: step.origin.rotation.y,
        z: step.origin.rotation.z,
        w: step.origin.rotation.w,
      },
    },
  };
}

function validText(value: string, max: number, name: string): void {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new Error(`${name} must be non-empty and at most ${max} characters`);
  }
}

function validatePose(pose: Pose): void {
  if (!pose || !pose.position || !pose.rotation) throw new Error("Missing origin pose");
  const p = pose.position;
  const q = pose.rotation;
  if (![p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(Number.isFinite)) {
    throw new Error("Origin pose must contain finite numeric coordinates");
  }
  const norm = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (Math.abs(norm - 1) > 0.01) throw new Error("Origin rotation must be a unit quaternion");
}

export class RepairSession {
  private steps: RepairStep[] = [];
  private mode: SessionMode = "recording";
  private resumeMode: "recording" | "rewinding" = "recording";
  private cursor = -1;
  private readonly maxSteps: number;

  constructor(maxSteps = 24) {
    if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 100) {
      throw new Error("Step limit must be an integer from 1 to 100");
    }
    this.maxSteps = maxSteps;
  }

  record(partId: string, label: string, origin: Pose): RepairStep {
    this.requireMode("recording");
    validText(partId, 64, "Part ID");
    validText(label, 100, "Label");
    validatePose(origin);
    if (this.steps.some(step => step.partId === partId)) throw new Error("Part already recorded");
    if (this.steps.length >= this.maxSteps) throw new Error("Session step limit reached");
    const step = cloneStep({ partId, label, origin, sequence: this.steps.length + 1 });
    this.steps.push(step);
    return cloneStep(step);
  }

  /** A corrected capture can only remove the most recent observation. */
  undoLastRecord(): RepairStep {
    this.requireMode("recording");
    const last = this.steps.pop();
    if (!last) throw new Error("No observation to undo");
    return cloneStep(last);
  }

  beginReassembly(): void {
    this.requireMode("recording");
    if (this.steps.length === 0) throw new Error("Record a part before reassembling");
    this.cursor = this.steps.length - 1;
    this.mode = "rewinding";
  }

  /** Explicit user confirmation only; never a sensor verdict or automatic advance. */
  confirmReturn(partId: string): void {
    this.requireMode("rewinding");
    const current = this.steps[this.cursor];
    if (!current || current.partId !== partId) throw new Error("Confirm only the current part");
    this.cursor -= 1;
    if (this.cursor < 0) this.mode = "complete";
  }

  undoReturn(): void {
    if (this.mode !== "rewinding" && this.mode !== "complete") {
      throw new Error("Return undo requires reassembly mode");
    }
    if (this.cursor >= this.steps.length - 1) throw new Error("No return to undo");
    this.cursor += 1;
    this.mode = "rewinding";
  }

  pause(): void {
    if (this.mode !== "recording" && this.mode !== "rewinding") {
      throw new Error("Only an active session can pause");
    }
    this.resumeMode = this.mode;
    this.mode = "paused";
  }

  resume(): void {
    this.requireMode("paused");
    this.mode = this.resumeMode;
  }

  reset(): void {
    this.steps = [];
    this.mode = "recording";
    this.resumeMode = "recording";
    this.cursor = -1;
  }

  view(): SessionView {
    const isReassembly = this.mode === "rewinding" || this.mode === "complete" ||
      (this.mode === "paused" && this.resumeMode === "rewinding");
    return {
      mode: this.mode,
      recordedCount: this.steps.length,
      returnedCount: isReassembly ? this.steps.length - this.cursor - 1 : 0,
      current: this.mode === "rewinding" ? cloneStep(this.steps[this.cursor]) : null,
      steps: this.steps.map(cloneStep),
    };
  }

  private requireMode(expected: SessionMode): void {
    if (this.mode !== expected) throw new Error(`Action requires ${expected} mode`);
  }
}
