import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const zeroLinePlugin = {
  id: 'zeroLine',
  afterDatasetsDraw(chart) {
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;

    const labels = chart.data.labels || [];
    const zeroIndex = labels.findIndex(label => Number(label) >= 0);
    if (zeroIndex < 0) return;

    const x = xScale.getPixelForTick(zeroIndex);
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, yScale.top);
    ctx.lineTo(x, yScale.bottom);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(220, 53, 69, 0.8)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

function TradeHistogram({ distribution }) {
  const bins = distribution?.bins || [];
  const counts = distribution?.counts || [];

  if (!bins.length || !counts.length) {
    return <div className="loading">No closed-trade PnL distribution available</div>;
  }

  const chartData = {
    labels: bins.map(value => Number(value).toFixed(2)),
    datasets: [
      {
        label: 'Trade Count',
        data: counts,
        backgroundColor: bins.map(value => Number(value) < 0 ? 'rgba(220, 53, 69, 0.75)' : 'rgba(0, 123, 255, 0.75)'),
        borderColor: bins.map(value => Number(value) < 0 ? 'rgb(220, 53, 69)' : 'rgb(0, 123, 255)'),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Trade PnL Distribution' },
      tooltip: {
        callbacks: {
          title: items => `PnL bin: Rs.${items[0].label}`,
          label: context => `Frequency: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'PnL value' } },
      y: {
        title: { display: true, text: 'Frequency' },
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  return (
    <div style={{ height: '100%' }}>
      <Bar data={chartData} options={options} plugins={[zeroLinePlugin]} />
    </div>
  );
}

export default TradeHistogram;
