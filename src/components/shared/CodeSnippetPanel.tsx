import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { titleCase } from '@/logic/format'

interface CodeSnippetPanelProps {
  repository: string
  filePath: string
  line: number
  branch?: string
  commit?: string
  language?: string
  usageType?: string
  snippet: string
  /** 1-based line inside the snippet to highlight. */
  highlightLine?: number
  onOpenInDevin?: () => void
  className?: string
}

export function CodeSnippetPanel({
  repository,
  filePath,
  line,
  branch,
  commit,
  language,
  usageType,
  snippet,
  highlightLine,
  onOpenInDevin,
  className,
}: CodeSnippetPanelProps) {
  const [copied, setCopied] = useState(false)
  const reference = `${repository}/${filePath}:${line}`

  const copyReference = async () => {
    await navigator.clipboard.writeText(reference)
    setCopied(true)
    setTimeout(() => setCopied(false), 1_500)
  }

  return (
    <div className={cn('overflow-hidden rounded-md border bg-surface shadow-panel', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-surface-muted/70 px-3 py-2">
        <span className="truncate font-mono text-xs text-foreground">{reference}</span>
        <div className="flex items-center gap-2 text-2xs uppercase tracking-wide text-muted-foreground">
          {branch ? <span>{branch}</span> : null}
          {commit ? <span className="font-mono">{commit}</span> : null}
          {language ? <span>{language}</span> : null}
          {usageType ? (
            <span className="rounded border bg-surface px-1.5 py-0.5 normal-case tracking-normal">
              {titleCase(usageType)}
            </span>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copyReference}>
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy path'}
          </Button>
          {onOpenInDevin ? (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onOpenInDevin}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open in Devin
            </Button>
          ) : null}
        </div>
      </div>
      <pre className="scrollbar-thin overflow-x-auto bg-navy-950 px-0 py-2 text-xs leading-5 text-navy-100">
        <code>
          {snippet.split('\n').map((text, index) => {
            const lineNumber = index + 1
            const isHighlighted = highlightLine === lineNumber
            return (
              <span
                key={lineNumber}
                className={cn(
                  'grid grid-cols-[2.5rem_1fr] px-0',
                  isHighlighted && 'bg-navy-800/80',
                )}
              >
                <span className="select-none pr-3 text-right text-navy-400">{line + index}</span>
                <span className="whitespace-pre pr-4">{text}</span>
              </span>
            )
          })}
        </code>
      </pre>
    </div>
  )
}
