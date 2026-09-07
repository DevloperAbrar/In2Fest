import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import { adminLoginSchema } from "../../components/forms/validationSchemas";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { showSuccess, showError } from "../../components/common/Toast";

export default function AdminLoginForm() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(adminLoginSchema) });

  const onSubmit = async (values) => {
    try {
      await loginAdmin(values.email, values.password);
      showSuccess("Welcome back!");
      navigate("/admin");
    } catch (err) {
      showError(err.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        placeholder="admin@venuesafar.com"
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
        Sign in as Super Admin
      </Button>
    </form>
  );
}