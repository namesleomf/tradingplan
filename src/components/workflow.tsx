"use client";
import { Route, Check } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { steps, pages } from "@/data/navigation";
import { changeDay } from "@/lib/db";
import { requirements, guardrails, applicable } from "@/lib/rules";
import { SectionBody, Result } from "./section-page";
import { Button } from "./ui/button";
export function Workflow() {
  const { day, items, pack, week, account, now } = useWorkspace(),
    step = day.step;
  const go = (n: number) =>
    changeDay(day, (d) => {
      d.step = n;
    });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Route size={14} />
            Trading session
          </div>
          <h1>Guided Workflow</h1>
          <p>
            Work through each step with the same checklists used in your plan.
          </p>
        </div>
      </div>
      <div className="workflow">
        <nav className="stepper" aria-label="Workflow steps">
          {steps.map((id, i) => {
            const label =
              i === 8
                ? "Risk Verification"
                : pages.find((p) => p.id === id)!.title;
            const has = items.some(
              (n) =>
                n.section === id &&
                applicable(n, day) &&
                !n.heading &&
                n.mode !== "Reference",
            );
            const findings =
              i === 8
                ? guardrails(pack, account, day, week, now)
                : requirements(items, day, [id]);
            const status = findings.some((f) => f.status === "Invalid")
              ? "Invalid"
              : findings.length
                ? "Incomplete"
                : has || i === 8
                  ? "Valid"
                  : "Not Applicable";
            return (
              <button
                key={id}
                className={step === i ? "current" : ""}
                onClick={() => go(i)}
                aria-current={step === i ? "step" : undefined}
              >
                <span className="step-no">
                  {status === "Valid" ? <Check size={13} /> : i + 1}
                </span>
                <span>
                  {label}
                  <small>{status}</small>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="stack">
          <div>
            <div className="eyebrow">
              Step {step + 1} of {steps.length}
            </div>
            <h2 className="step-title">
              {step === 8
                ? "Risk Verification"
                : pages.find((p) => p.id === steps[step])!.title}
            </h2>
          </div>
          <SectionBody id={steps[step]} />
          {step === 8 && <Result />}
          <div className="workflow-nav">
            <Button
              variant="outline"
              disabled={!step}
              onClick={() => go(step - 1)}
            >
              Previous
            </Button>
            {step < 8 && (
              <Button onClick={() => go(step + 1)}>Next step</Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
