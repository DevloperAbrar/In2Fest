import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { inquiryFormSchema } from "../../../components/forms/validationSchemas";
import { inquiryService } from "../../../services/inquiryService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Send } from "lucide-react";

export default function InquiryForm({ venue, slots }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(inquiryFormSchema)
  });

  const onSubmit = async (values) => {
    try {
      await inquiryService.submitPublic(venue.id, values);
      showSuccess("Thank you! We'll get back to you shortly.");
      reset();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to submit inquiry");
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border bg-gray-800 border-gray-700 text-white placeholder-gray-500
    text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all`;

  return (
    <section id="inquiry" className="py-24 bg-gray-900 dark:bg-black transition-colors">
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-purple-400">
            Reserve Your Date
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">Enquire Now</h2>
          <p className="text-gray-400 mt-3 text-sm">Fill in your details and we'll get back to you within 24 hours.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input className={inputClass} placeholder="Your Name *" {...register("customer_name")} />
              {errors.customer_name && <p className="text-red-400 text-xs mt-1">{errors.customer_name.message}</p>}
            </div>
            <div>
              <input className={inputClass} placeholder="Phone Number *" {...register("phone")} />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <input className={inputClass} placeholder="Email (optional)" {...register("email")} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input type="date" className={inputClass} {...register("event_date")}
                min={new Date().toISOString().split("T")[0]} />
              {errors.event_date && <p className="text-red-400 text-xs mt-1">{errors.event_date.message}</p>}
            </div>
            <select className={inputClass} {...register("slot_id")}>
              <option value="">Select Slot (optional)</option>
              {(slots || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input className={inputClass} placeholder="Event Type (e.g. Wedding) *" {...register("event_type")} />
              {errors.event_type && <p className="text-red-400 text-xs mt-1">{errors.event_type.message}</p>}
            </div>
            <div>
              <input type="number" className={inputClass} placeholder="Guest Count *" {...register("guest_count")} />
              {errors.guest_count && <p className="text-red-400 text-xs mt-1">{errors.guest_count.message}</p>}
            </div>
          </div>

          <textarea className={inputClass} rows={3} placeholder="Message (optional)" {...register("message")} />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-transform hover:scale-105 disabled:opacity-60"
            style={{ backgroundColor: venue?.theme_color || "#7c3aed" }}
          >
            <Send size={18} />
            {isSubmitting ? "Submitting..." : "Submit Inquiry"}
          </button>
        </form>
      </div>
    </section>
  );
}