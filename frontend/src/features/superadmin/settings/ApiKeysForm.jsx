import React from "react";
import { useForm } from "react-hook-form";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { showSuccess } from "../../../components/common/Toast";

export default function ApiKeysForm() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const onSubmit = async () => {
    // Backend note: implement PATCH /api/settings/api-keys to persist these securely.
    showSuccess("API keys saved (wire up backend settings endpoint to persist)");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Cashfree App ID" {...register("cashfreeAppId")} />
      <Input label="Cashfree Secret Key" type="password" {...register("cashfreeSecretKey")} />
      <Input label="WhatsApp API Key" type="password" {...register("whatsappApiKey")} />
      <Button type="submit" loading={isSubmitting}>Save Keys</Button>
    </form>
  );
}