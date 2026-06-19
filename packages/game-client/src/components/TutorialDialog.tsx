import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DialogRequest } from "@/game/bridge";

interface TutorialDialogProps {
  dialog: DialogRequest | null;
  onClose: () => void;
}

export function TutorialDialog({ dialog, onClose }: TutorialDialogProps) {
  const open = Boolean(dialog);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && dialog) {
          dialog.onDismiss();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        {dialog?.badge && (
          <Badge variant="outline" className="w-fit font-mono text-[11px] uppercase tracking-wider">
            {dialog.badge}
          </Badge>
        )}
        <DialogHeader>
          {dialog?.title && <DialogTitle>{dialog.title}</DialogTitle>}
          <DialogDescription className="text-base text-foreground/90 whitespace-pre-line">
            {dialog?.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              dialog?.onDismiss();
              onClose();
            }}
          >
            {dialog?.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
