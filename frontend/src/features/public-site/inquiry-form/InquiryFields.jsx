import React from "react";

// The date / slot / type / count part of the website enquiry form.
// Each template passes its own input classes, so the look stays the same.
export default function InquiryFields({
  register,
  errors,
  cfg,
  showSlots,
  slots,
  inputClass,
  inputStyle = {},
  selectStyle = {},
  errorClass = "text-red-500 text-xs mt-1",
  optionClass = ""
}) {
  const today = new Date().toISOString().split("T")[0];
  const withLabels = !cfg.isEvent;
  const label = (text) =>
    withLabels ? <label className="block text-xs font-medium opacity-60 mb-1.5">{text}</label> : null;

  const dateCell = (
    <div>
      {label(cfg.dateLabel)}
      <input
        type="date"
        className={inputClass}
        style={{ ...inputStyle, ...selectStyle }}
        min={today}
        {...register("event_date")}
      />
      {errors.event_date && <p className={errorClass}>{errors.event_date.message}</p>}
    </div>
  );

  const slotCell = showSlots ? (
    <div>
      {label("Preferred slot (optional)")}
      <select className={inputClass} style={{ ...inputStyle, ...selectStyle }} {...register("slot_id")}>
        <option value="" className={optionClass}>Select Slot (optional)</option>
        {(slots || []).map((s) => (
          <option key={s.id} value={s.id} className={optionClass}>{s.name}</option>
        ))}
      </select>
    </div>
  ) : null;

  const typeCell = (
    <div>
      {label(cfg.typeLabel)}
      {cfg.types ? (
        <select className={inputClass} style={{ ...inputStyle, ...selectStyle }} {...register("event_type")}>
          <option value="" className={optionClass}>Select an option *</option>
          {cfg.types.map((t) => (
            <option key={t} value={t} className={optionClass}>{t}</option>
          ))}
        </select>
      ) : (
        <input className={inputClass} style={inputStyle} placeholder={`${cfg.typeLabel} *`} {...register("event_type")} />
      )}
      {errors.event_type && <p className={errorClass}>{errors.event_type.message}</p>}
    </div>
  );

  const countCell =
    cfg.countLabel !== null ? (
      <div>
        {label(cfg.countLabel)}
        <input
          type="number"
          min="1"
          className={inputClass}
          style={inputStyle}
          placeholder={cfg.countRequired ? `${cfg.countLabel} *` : cfg.countLabel}
          {...register("guest_count")}
        />
        {errors.guest_count && <p className={errorClass}>{errors.guest_count.message}</p>}
      </div>
    ) : null;

  // Events keep the original order. Other businesses ask what the customer wants first.
  const cells = (cfg.isEvent
    ? [["date", dateCell], ["slot", slotCell], ["type", typeCell], ["count", countCell]]
    : [["type", typeCell], ["date", dateCell], ["slot", slotCell], ["count", countCell]]
  ).filter(([, node]) => node);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cells.map(([key, node], i) => (
        <div key={key} className={cells.length % 2 === 1 && i === cells.length - 1 ? "sm:col-span-2" : ""}>
          {node}
        </div>
      ))}
    </div>
  );
}