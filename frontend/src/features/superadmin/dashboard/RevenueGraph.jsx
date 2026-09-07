import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Card from "../../../components/common/Card";

export default function RevenueGraph({ data = [] }) {
  return (
    <Card title="Monthly Recurring Revenue">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}