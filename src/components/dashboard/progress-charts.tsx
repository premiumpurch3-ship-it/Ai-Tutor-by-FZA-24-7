"use client";

import { Card, EmptyState } from "@/components/ui/primitives";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Props {
  quizScoreSeries: { date: string; percent: number }[];
  flashcardTally: { known: number; unknown: number };
}

const COLORS = ["#38e5c8", "#f5636a"];

export function ProgressCharts({ quizScoreSeries, flashcardTally }: Props) {
  const pieData = [
    { name: "Known", value: flashcardTally.known },
    { name: "Still learning", value: flashcardTally.unknown },
  ];
  const hasFlashcardData = flashcardTally.known + flashcardTally.unknown > 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-4 font-semibold text-white">Quiz score trend</h2>
        {quizScoreSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={quizScoreSeries}>
              <XAxis dataKey="date" stroke="#9096a8" fontSize={12} />
              <YAxis stroke="#9096a8" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#161923", border: "1px solid #ffffff1a", borderRadius: 12 }} />
              <Line type="monotone" dataKey="percent" stroke="#7c6cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No quiz attempts yet" description="Take a quiz to see your score trend here." />
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-white">Flashcard recall</h2>
        {hasFlashcardData ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#161923", border: "1px solid #ffffff1a", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No flashcard reviews yet" description="Review a deck to see your recall breakdown." />
        )}
      </Card>
    </div>
  );
}
