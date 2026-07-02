"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type ApprovalActionButtonsProps = {
  requestId: string;
  approveAction: (formData: FormData) => void | Promise<void>;
  rejectAction: (formData: FormData) => void | Promise<void>;
};

export function ApprovalActionButtons({
  requestId,
  approveAction,
  rejectAction
}: ApprovalActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <form action={rejectAction}>
        <input type="hidden" name="requestId" value={requestId} />
        <ApprovalButton variant="secondary" label="Reject" pendingLabel="Rejecting" />
      </form>
      <form action={approveAction}>
        <input type="hidden" name="requestId" value={requestId} />
        <ApprovalButton label="Approve" pendingLabel="Approving" />
      </form>
    </div>
  );
}

function ApprovalButton({
  label,
  pendingLabel,
  variant = "primary"
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

