"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Select…",
  disabled = false,
}: {
  label: string;
  value: string;
  options: (string | [string, string])[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="select-wrap">
        <select
          aria-label={label}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => {
            const [v, l] = Array.isArray(o) ? o : [o, o];
            return (
              <option key={v} value={v}>
                {l}
              </option>
            );
          })}
        </select>
        <ChevronDown size={14} />
      </span>
    </label>
  );
}
export function Input({
  label,
  value,
  onSave,
  type = "text",
  multiline = false,
  placeholder = "",
  disabled = false,
  prefix,
  min,
  step,
}: {
  label: string;
  value: string;
  onSave: (v: string) => unknown;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  prefix?: string;
  min?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  const shared = {
    "aria-label": label,
    value: draft,
    disabled,
    placeholder,
    onFocus: () => {
      focused.current = true;
    },
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      setDraft(e.target.value);
      if (multiline) onSave(e.target.value);
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      focused.current = false;
      if (multiline) return;
      if (e.target.reportValidity() && draft !== value) onSave(draft);
      else setDraft(value);
    },
  };
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea {...shared} rows={3} />
      ) : (
        <span className={prefix ? "input-wrap" : "input-plain"}>
          {prefix && <span>{prefix}</span>}
          <input {...shared} type={type} min={min} step={step} />
        </span>
      )}
    </label>
  );
}
export function Panel({
  icon,
  title,
  aside,
  children,
}: {
  icon?: ReactNode;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>
          {icon}
          {title}
        </h2>
        {aside}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Checkbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => unknown;
  disabled?: boolean;
}) {
  const [current, setCurrent] = useState(checked);
  useEffect(() => setCurrent(checked), [checked]);
  return (
    <input
      type="checkbox"
      checked={current}
      disabled={disabled}
      onChange={async (e) => {
        const next = e.target.checked;
        setCurrent(next);
        if ((await onChange(next)) === false) setCurrent(checked);
      }}
    />
  );
}
