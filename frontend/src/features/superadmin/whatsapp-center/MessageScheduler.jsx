import React from "react";
import Input from "../../../components/common/Input";

export default function MessageScheduler({ register }) {
  return (
    <Input
      label="Schedule for later (optional)"
      type="datetime-local"
      {...register("scheduledFor")}
    />
  );
}