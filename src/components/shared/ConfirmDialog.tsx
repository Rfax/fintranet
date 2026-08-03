import { useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EnvironmentWarning } from './EnvironmentWarning'
import type { EnvironmentKey } from '@/types'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  /** Rendered above the reason field, e.g. a before/after diff. */
  details?: ReactNode
  confirmLabel: string
  destructive?: boolean
  requireReason?: boolean
  /** Requires typing the record key when the change affects production. */
  typedConfirmation?: string
  environment?: EnvironmentKey
  onConfirm: (reason: string) => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  confirmLabel,
  destructive = false,
  requireReason = false,
  typedConfirmation,
  environment,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')

  const reasonSatisfied = !requireReason || reason.trim().length >= 8
  const typedSatisfied = !typedConfirmation || typed.trim() === typedConfirmation

  const close = () => {
    setReason('')
    setTyped('')
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {destructive ? <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden /> : null}
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm">{description}</DialogDescription>
        </DialogHeader>

        {environment === 'production' ? (
          <EnvironmentWarning environment="production" compact />
        ) : null}

        {details}

        {requireReason ? (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason" className="text-label">
              Reason (required)
            </Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this action is being taken. Recorded in the activity history."
              className="min-h-[72px] text-sm"
            />
          </div>
        ) : null}

        {typedConfirmation ? (
          <div className="space-y-1.5">
            <Label htmlFor="typed-confirmation" className="text-label">
              Type <span className="font-mono normal-case">{typedConfirmation}</span> to confirm
            </Label>
            <Input
              id="typed-confirmation"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="h-8 font-mono text-sm"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={!reasonSatisfied || !typedSatisfied}
            onClick={() => {
              onConfirm(reason.trim())
              close()
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
