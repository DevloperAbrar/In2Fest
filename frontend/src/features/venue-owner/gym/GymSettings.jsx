import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage,  errMsg } from "./gymShared.jsx";



export default function GymSettings() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/settings` : null, { skip: !vid });
  const [f, setF] = useState(null);
  const [rz, setRz] = useState({ key_id: "", key_secret: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setF({ receipt_prefix: data.receipt_prefix, message_templates: { ...(data.message_templates || {}) } });
  }, [data]);

  if (loading || !f) return <GymPage title="Gym settings"><Loader /></GymPage>;

  const save = async (extra = {}) => {
    setBusy(true);
    try {
      await gymService.saveSettings(vid, { receipt_prefix: f.receipt_prefix, message_templates: f.message_templates, ...extra });
      showSuccess("Settings saved");
      setRz({ key_id: "", key_secret: "" });
      refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const setT = (k) => (e) => setF((s) => ({ ...s, message_templates: { ...s.message_templates, [k]: e.target.value } }));

  return (
    <GymPage title="Gym settings" subtitle="Receipts, message text and online payments"
      actions={<Button onClick={() => save()} loading={busy}>Save</Button>}>
      <Card title="Receipts" className="mb-4">
        <Input label="Receipt number prefix" maxLength={8} value={f.receipt_prefix} onChange={(e) => setF({ ...f, receipt_prefix: e.target.value })} />
        <p className="text-xs text-gray-500 mt-2">Receipts are numbered like RCPT-00001. Open a member and download any receipt as a PDF to share.</p>
      </Card>

      <Card title="Online payments" className="mb-4">
        <p className="text-sm text-gray-600 mb-3">
          {data.razorpay_connected
            ? <>Razorpay is connected (<b>{data.razorpay_key_id}</b>). Payment links are paid straight into your Razorpay account and confirmed automatically.</>
            : <>Without Razorpay, links show a UPI QR using the UPI ID from <Link to="/dashboard/settings/payment" className="text-primary-600 font-medium">Settings &gt; Payment</Link>, and you confirm each payment yourself.</>}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Razorpay Key ID" placeholder="rzp_live_..." value={rz.key_id} onChange={(e) => setRz({ ...rz, key_id: e.target.value })} />
          <Input label="Razorpay Key Secret" type="password" autoComplete="off" value={rz.key_secret} onChange={(e) => setRz({ ...rz, key_secret: e.target.value })} />
        </div>
        <div className="flex gap-2 mt-3">
          <Button onClick={() => save({ razorpay_key_id: rz.key_id, razorpay_key_secret: rz.key_secret })} loading={busy} disabled={!rz.key_id || !rz.key_secret}>
            {data.razorpay_connected ? "Replace keys" : "Connect Razorpay"}
          </Button>
          {data.razorpay_connected && <Button variant="outline" onClick={() => save({ razorpay_disconnect: true })}>Disconnect</Button>}
        </div>
      </Card>

      <Card title="Message templates">
        <p className="text-sm text-gray-600">
          Renewal, dues, birthday, offer and lead messages now live in the <Link to="/dashboard/gym/messages" className="text-primary-600 font-medium">Messages</Link> tab,
          where you can edit them and create your own. Your earlier edits are kept.
        </p>
      </Card>
    </GymPage>
  );
}