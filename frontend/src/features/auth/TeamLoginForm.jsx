import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import { teamLoginSchema } from "../../components/forms/validationSchemas";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { showSuccess, showError } from "../../components/common/Toast";

export default function TeamLoginForm() {
  const { loginTeamMember } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(teamLoginSchema) });

  const onSubmit = async (values) => {
    try {
      await loginTeamMember(values.email, values.password);
      showSuccess("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      showError(err.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}