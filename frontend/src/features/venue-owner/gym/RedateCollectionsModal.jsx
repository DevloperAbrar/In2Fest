import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { gymService } from "../../../services/gymService";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { inr, errMsg } from "./gymShared.jsx";

const monthName = (ym) => {
  const d = dayjs(`${ym}-01`);
  return d.isValid() ? d.format("MMM YYYY") : ym;
};

export default function RedateCollectionsModal({ vid, onClose, onDone }) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = false;
    gymService.redatePreview(vid)
      .then((r) => { if (!off) setState({ loading: false, data: r.data.data, error: "" }); })
      .catch((e) => { if (!off) setState({ loading: false, data: null, error: errMsg(e, "Could not check the collections") }); });
    return () => { off = true; };
  }, [vid]);

  const apply = async () => {
    setBusy(true);
    try {
      const r = await gymService.redateApply(vid);
      showSuccess(`${r.data.data.count} payment(s) moved to the correct month`);
      onDone();
      onClose();
    } catch (e) {
      showError(errMsg(e, "Could not update the collections"));
    } finally {
      setBusy(false);
    }
  };

  const d = state.data;
  return (
    <Modal isOpen onClose={onClose} title="Fix collection months" size="md">
      {state.loading ? <Loader /> : state.error ? (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{state.error}</p>
          <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Close</Button></div>
        </div>
      ) : d.count === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">All collections are already in the correct month. Nothing to change.</p>
          <div className="flex justify-end"><Button onClick={onClose}>Close</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            <b>{d.count}</b> payment(s) worth <b>{inr(d.amount)}</b> were saved in a later month than the membership they belong to
            (for example members added with an old start date). They will be moved to the month the membership started.
          </p>
          <div className="rounded-xl border border-navy-100 divide-y max-h-56 overflow-y-auto">
            {d.moves.map((m) => (
              <div key={`${m.from}-${m.to}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-gray-700">{monthName(m.from)} → <b>{monthName(m.to)}</b></span>
                <span className="text-gray-500 tabular-nums">{m.count} payment{m.count === 1 ? "" : "s"} · {inr(m.amount)}</span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-gray-400 leading-snug">
            Only the payment taken while adding or renewing the member is moved. Online payments and payments you edited yourself are not touched.
            Receipts will show the new date. The old date is kept in the payment record.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button onClick={apply} loading={busy}>Move {d.count} payment{d.count === 1 ? "" : "s"}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}