import React from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import ApiKeysForm from "./ApiKeysForm.jsx";
import { useForm } from "react-hook-form";
import { showSuccess } from "../../../components/common/Toast";

export default function PlatformSettings() {
  const { register, handleSubmit } = useForm();

  const onSubmit = () => showSuccess("Platform settings saved (wire up backend endpoint to persist)");

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Platform Info">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Platform Name" defaultValue="In2Fest" {...register("platformName")} />
            <Button type="submit">Save</Button>
          </form>
        </Card>

        <Card title="API Keys">
          <ApiKeysForm />
        </Card>
      </div>
    </DashboardLayout>
  );
}