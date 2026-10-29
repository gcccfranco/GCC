// lib/dnd/sensors.ts
import { useSensor, useSensors, KeyboardSensor, PointerSensor, TouchSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export function useDefaultSensors() {
  return useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
}

/** Les mêmes, plus le clavier (lot U6) : sur la poignée, Espace ou Entrée
 *  saisit, les flèches déplacent, Espace ou Entrée pose, Échap annule. */
export function useSensorsAvecClavier() {
  return useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}
