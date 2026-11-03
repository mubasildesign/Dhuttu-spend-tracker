"use client";

import { Info } from "@phosphor-icons/react";
import { useId, useState } from "react";

type Props = {
  title?: string;
  children: string;
};

/** Compact “i” next to a heading — tip opens on hover / focus. */
export function InfoTip({ title = "Tip", children }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`info-tip ${open ? "open" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="info-tip-btn"
        aria-describedby={open ? id : undefined}
        aria-label={title}
      >
        <Info size={16} weight="fill" />
      </button>
      {open ? (
        <span role="tooltip" id={id} className="info-tip-bubble">
          <strong>{title}</strong>
          <span>{children}</span>
        </span>
      ) : null}
    </span>
  );
}
