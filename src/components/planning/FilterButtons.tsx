"use client"

interface FilterButtonsProps {
  options: string[]
  active: string
  onChange: (v: string) => void
  className?: string
}

export function FilterButtons({ options, active, onChange, className }: FilterButtonsProps) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 scrollbar-none ${className ?? ""}`}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer ${
            opt === active
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
