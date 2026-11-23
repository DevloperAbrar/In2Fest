import React, { useEffect, useState } from "react";
import { MessageSquarePlus, Pencil } from "lucide-react";
import { gymService } from "../../../services/gymService";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Field, TextArea, errMsg } from "./gymShared.jsx";

const QUICK_REASONS = [
  "Too expensive", "Shifted to another city", "Joined another gym", "No time / work schedule",
  "Health or injury", "Lost interest", "Will return later"
];

// A reason can be noted for members whose plan has ended or is about to end.
export const canNoteReason = (m) => !!m && (m.display_status === "expired" || m.display_status === "expiring");

export function ReasonModal({ vid, member, onClose, onSaved }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setText(member?.leave_reason || ""); }, [member]);

  const save = async (value) => {
    setBusy(true);
    try {
      await gymService.updateMember(vid, member.id, { leave_reason: value });
      showSuccess(value ? "Reason saved" : "Reason removed");
      onSaved();
      onClose();
    } catch (e) {
      showError(errMsg(e, "Could not save the reason"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={!!member} onClose={onClose} title="Reason for not continuing" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          {member?.name} <span className="text-gray-400">{member?.member_code}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setText(r)}
              className={`px-2.5 py-1 rounded-full border text-[12px] font-medium ${text === r ? "bg-primary-600 text-white border-primary-600" : "bg-white text-navy-600 border-navy-100 hover:border-primary-300"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <Field label="Reason (short note)">
          <TextArea rows={3} maxLength={200} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Moved to Bhilai for a new job" />
        </Field>
        <p className="text-[11px] text-gray-400 text-right">{text.length}/200</p>
        <div className="flex justify-end gap-2">
          {member?.leave_reason && (
            <Button variant="outline" onClick={() => save("")} disabled={busy}>Remove</Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => save(text.trim())} loading={busy} disabled={!text.trim()}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// One small line for every expired / expiring member: the saved reason, or an "Add reason" button.
export function ReasonLine({ member, onOpen, className = "" }) {
  if (!canNoteReason(member)) return null;
  const reason = member.leave_reason;
  return (
    <div className={`flex items-start gap-2 text-[12px] ${className}`}>
      {reason ? (
        <>
          <p className="min-w-0 flex-1 text-navy-600 leading-snug break-words">
            <span className="font-semibold text-navy-700">Reason: </span>{reason}
          </p>
          <button type="button" onClick={() => onOpen(member)} aria-label="Edit reason" className="shrink-0 p-1 -m-1 text-navy-400 hover:text-primary-600">
            <Pencil size={13} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(member)}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-navy-200 px-2.5 py-1 font-medium text-navy-500 hover:border-primary-300 hover:text-primary-600"
        >
          <MessageSquarePlus size={13} /> Add reason for not continuing
        </button>
      )}
    </div>
  );
}