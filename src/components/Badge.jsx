import React from "react";
import clsx from "clsx";

export default function Badge({ children, tone="soft" }) {
  const base = "badge";
  const toneClass = {
    soft: "badge-soft",
    blue: "badge-blue",
  }[tone] || "badge-soft";
  return <span className={clsx(base, toneClass)}>{children}</span>;
}
