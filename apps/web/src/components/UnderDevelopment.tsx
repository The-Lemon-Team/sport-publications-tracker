import { Construction } from 'lucide-react'

export function UnderDevelopment({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Construction className="size-8" />
      </span>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Страница в разработке. Скоро здесь появится новый функционал.
        </p>
      </div>
    </div>
  )
}
