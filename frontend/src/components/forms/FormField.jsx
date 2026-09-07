import React from "react";
import Input from "../common/Input";

export default function FormField({ register, name, error, ...props }) {
  return <Input {...register(name)} error={error?.message} {...props} />;
}