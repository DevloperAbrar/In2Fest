import React, { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { errMsg } from "./gymShared.jsx";

const ORDER = ["members", "store", "leads", "setup"];
const STEP_TITLES = { 1: "Step 1 of 3 - Choose what to erase", 2: "Step 2 of 3 - Confirm it's you", 3: "Step 3 of 3 - Final confirmation" };

export default function GymDataErase() {
  const { venue } = useVenue();
  const vid = venue?.id;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(new Set());
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(null);
  const [phrase, setPhrase] = useState("");
  const [ack, setAck] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep(1); setSummary(null); setSel(new Set()); setPassword(""); setEmail("");
    setToken(null); setPhrase(""); setAck(false); setResult(null); setError("");
  };

  const openModal = async () => {
    reset();
    setOpen(true);
    setLoading(true);
    try {
      const res = await gymService.eraseSummary(vid);
      setSummary(res.data?.data || null);
    } catch (e) {
      showError(errMsg(e));
      setOpen(false);
    } finally { setLoading(false); }
  };

  const close = () => { if (busy) return; setOpen(false); reset(); };

  const chosen = ORDER.filter((k) => sel.has(k));
  const totalSelected = summary ? chosen.reduce((n, k) => n + (summary.scopes[k]?.total || 0), 0) : 0;

  const toggle = (k) => setSel((prev) => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    if (!n.has("members")) n.delete("setup"); // setup needs members
    return n;
  });

  const verify = async () => {
    setBusy(true); setError("");
    try {
      const res = await gymService.eraseVerify(vid, { scopes: chosen, password, email });
      setToken(res.data?.data?.token || null);
      setPassword(""); setStep(3);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const erase = async () => {
    setBusy(true); setError("");
    try {
      const res = await gymService.eraseExecute(vid, { scopes: chosen, token, phrase, acknowledge: ack });
      setResult(res.data?.data || {});
      showSuccess("Data erased permanently");
    } catch (e) {
      if (e?.response?.data?.errors?.code === "ERASE_TOKEN_INVALID") { setToken(null); setPhrase(""); setAck(false); setStep(2); }
      setError(errMsg(e));
    } finally { setBusy(false); }
  };

  const canErase = !!token && ack && phrase.trim() === (summary?.phrase || "DELETE ALL DATA");

  return (
    <>
      <Card title="Danger zone" className="mt-4 border-red-200">
        <p className="text-sm text-gray-600">
          Want to start fresh? You can permanently erase your gym members, store, leads (and optionally plans and setup).
          You will be asked to confirm in 3 steps. <b>Erased data cannot be restored.</b>
        </p>
        <Button variant="danger" className="mt-3" onClick={openModal} disabled={!vid}>Erase data...</Button>
      </Card>

      <Modal isOpen={open} onClose={close} title={result ? "Data erased" : STEP_TITLES[step]} size="md">
        {loading || !summary ? <Loader /> : result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-semibold"><CheckCircle2 className="w-5 h-5" /> Done. Your selected data has been erased.</div>
            {Object.entries(result.erased || {}).map(([scope, items]) => (
              <div key={scope} className="text-sm text-gray-700">
                <div className="font-medium">{summary.scopes[scope]?.label}</div>
                <ul className="ml-4 list-disc text-gray-600">
                  {Object.entries(items).map(([label, n]) => <li key={label}>{label}: {n}</li>)}
                </ul>
              </div>
            ))}
            <Button className="w-full" onClick={() => { close(); window.location.reload(); }}>Close</Button>
          </div>
        ) : step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Select what you want to erase. Nothing else is touched (your logo, website, billing and Staff stay as they are).</p>
            {ORDER.map((k) => {
              const s = summary.scopes[k];
              const disabled = k === "setup" && !sel.has("members");
              return (
                <label key={k} className={`block rounded-xl border-2 p-3 ${sel.has(k) ? "border-red-400 bg-red-50" : "border-gray-200"} ${disabled ? "opacity-50" : "cursor-pointer"}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={sel.has(k)} disabled={disabled} onChange={() => toggle(k)} />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-800">{s.label}</div>
                      <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                      <p className="text-xs text-gray-700 mt-1">
                        {s.items.filter((i) => i.count > 0).map((i) => `${i.label}: ${i.count}`).join(" · ") || "Nothing to erase here"}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={close}>Cancel</Button>
              <Button variant="danger" className="flex-1" disabled={!chosen.length || totalSelected === 0} onClick={() => { setError(""); setStep(2); }}>Continue</Button>
            </div>
            {chosen.length > 0 && totalSelected === 0 && <p className="text-xs text-gray-500">There is no data in the selected items.</p>}
          </div>
        ) : step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {summary.acting_as_admin
                ? (summary.needs_password
                  ? "You are in Admin preview. Enter YOUR Super Admin password to confirm."
                  : `You are in Admin preview. Type YOUR Super Admin email (${summary.email_hint}) to confirm.`)
                : (summary.needs_password
                  ? "Enter your account password to confirm it's you."
                  : `You signed in with Google. Type your account email (${summary.email_hint}) to confirm it's you.`)}
            </p>
            {summary.needs_password
              ? <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              : <Input label="Account email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setError(""); setStep(1); }} disabled={busy}>Back</Button>
              <Button variant="danger" className="flex-1" loading={busy} disabled={summary.needs_password ? !password : !email} onClick={verify}>Verify</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm"><AlertTriangle className="w-4 h-4" /> This will be erased permanently</div>
              <ul className="mt-2 ml-4 list-disc text-sm text-red-800">
                {chosen.flatMap((k) => summary.scopes[k].items.filter((i) => i.count > 0).map((i) => <li key={`${k}-${i.label}`}>{i.label}: {i.count}</li>))}
              </ul>
              <p className="text-xs text-red-700 mt-2">It cannot be undone and cannot be restored from the app.</p>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>I understand this data will be deleted forever.</span>
            </label>
            <Input label={`Type ${summary.phrase} to confirm`} autoComplete="off" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={close} disabled={busy}>Cancel</Button>
              <Button variant="danger" className="flex-1" loading={busy} disabled={!canErase} onClick={erase}>Erase permanently</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}