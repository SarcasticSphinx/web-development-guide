"use client";

import { useEffect } from "react";

export function CodeBlockInteractive() {
  useEffect(() => {
    const handleCopyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest(".code-block-copy");
      if (!button) return;

      const wrapper = button.closest(".code-block-wrapper");
      if (!wrapper) return;

      const encodedCode = wrapper.getAttribute("data-code");
      if (!encodedCode) return;

      const code = decodeURIComponent(encodedCode);

      try {
        await navigator.clipboard.writeText(code);

        // Toggle icons
        const copyIcon = button.querySelector(".copy-icon") as HTMLElement;
        const checkIcon = button.querySelector(".check-icon") as HTMLElement;
        const copyText = button.querySelector(".copy-text") as HTMLElement;

        if (copyIcon) copyIcon.style.display = "none";
        if (checkIcon) checkIcon.style.display = "block";
        if (copyText) copyText.textContent = "Copied!";

        setTimeout(() => {
          if (copyIcon) copyIcon.style.display = "block";
          if (checkIcon) checkIcon.style.display = "none";
          if (copyText) copyText.textContent = "Copy";
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    };

    document.addEventListener("click", handleCopyClick);
    return () => document.removeEventListener("click", handleCopyClick);
  }, []);

  // Handle anchor link clicks
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a.anchor-link");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href?.startsWith("#")) return;

      e.preventDefault();
      const element = document.getElementById(href.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  return null;
}
