import React from "react";
import { useForm } from "react-hook-form";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { whatsappService } from "../../../services/whatsappService";
import { showSuccess, showError } from "../../../components/common/Toast";
import MessageScheduler from "./MessageScheduler.jsx";
import TemplateManager from "./TemplateManager.jsx";
import MessageHistoryLog from "./MessageHistoryLog.jsx";

export default function MessageComposer() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const onSubmitDirect = async (values) => {
    try {
      await whatsappService.sendDirect(values);
      showSuccess("Message sent");
      reset();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to send message");
    }
  };

  const onSubmitBulk = async (values) => {
    try {
      const payload = {
        filter: { city: values.filterCity || undefined },
        message: values.message,
        scheduledFor: values.scheduledFor || undefined
      };
      const { data } = await whatsappService.sendBulk(payload);
      showSuccess(`Sent to ${data.data.sentCount} venues`);
      reset();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to send bulk message");
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="WhatsApp Notification Center">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Send Direct Message">
          <form onSubmit={handleSubmit(onSubmitDirect)} className="space-y-4">
            <Input label="Venue ID" {...register("venueId", { required: true })} />
            <Input label="Phone" {...register("phone", { required: true })} />
            <Input label="Message" {...register("message", { required: true })} />
            <MessageScheduler register={register} />
            <Button type="submit" loading={isSubmitting} className="w-full">Send</Button>
          </form>
        </Card>

        <Card title="Send Bulk Message">
          <form onSubmit={handleSubmit(onSubmitBulk)} className="space-y-4">
            <Input label="Filter by City (optional)" {...register("filterCity")} />
            <Input label="Message" {...register("message", { required: true })} />
            <MessageScheduler register={register} />
            <Button type="submit" loading={isSubmitting} className="w-full">Send Bulk</Button>
          </form>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <TemplateManager />
        <MessageHistoryLog />
      </div>
    </DashboardLayout>
  );
}