import { useEffect, useState, useRef } from "react";

const HIDE_THRESHOLD = 40;

export function useScrollDirection() {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  const accumulated = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY.current;
      lastY.current = currentY;

      // Défilement piloté (index A–Z sous le doigt) : les barres restent en
      // place, sinon elles se cachent et reviennent à chaque changement de sens.
      if (document.documentElement.hasAttribute("data-nav-lock")) {
        accumulated.current = 0;
        setVisible(true);
        return;
      }

      if (currentY < 10) {
        setVisible(true);
        accumulated.current = 0;
      } else if (delta > 0) {
        accumulated.current += delta;
        if (accumulated.current >= HIDE_THRESHOLD) {
          setVisible(false);
        }
      } else {
        accumulated.current = 0;
        setVisible(true);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}
