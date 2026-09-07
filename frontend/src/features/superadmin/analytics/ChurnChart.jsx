import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../../../components/common/Card";

const COLORS = ["#7c3aed", "#e5e7eb"];

export default function ChurnChart({ churnRate = 0 }) {
  const data = [{ name: "Churned", value: churnRate }, { name: "Retained", value: 100 - churnRate }];

  return (
    <Card title="Churn Rate">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80}>
            {data.map((entry, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-2xl font-bold text-primary-600 -mt-16">{churnRate}%</p>
    </Card>
  );
}