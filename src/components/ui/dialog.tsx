"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogTitle = DialogPrimitive.Title
const DialogDescription = DialogPrimitive.Description

/** Monté avec le contenu, donc à l'ouverture : avant que le piège à focus ne déplace le focus. */
function RetenirFocus({ avantRef }: { avantRef: React.MutableRefObject<Element | null> }) {
  React.useLayoutEffect(() => {
    avantRef.current = document.activeElement
  }, [avantRef])
  return null
}

/** Voile et pile communs (comme le tiroir et la fenêtre de confirmation) : `z-50`, noir à 35 %.
 *  Sans `DialogTrigger` (ouverte par un état), Radix ne sait pas où rendre le focus : on retient
 *  l'élément qui l'avait à l'ouverture. */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, onCloseAutoFocus, ...props }, ref) => {
  const avant = React.useRef<Element | null>(null)
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35" />
      <DialogPrimitive.Content
        ref={ref}
        aria-modal="true"
        className={cn("fixed z-50", className)}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus?.(e)
          if (e.defaultPrevented) return
          e.preventDefault()
          const el = avant.current
          if (el instanceof HTMLElement && el.isConnected && el !== document.body) el.focus()
        }}
        {...props}
      >
        <RetenirFocus avantRef={avant} />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription }
