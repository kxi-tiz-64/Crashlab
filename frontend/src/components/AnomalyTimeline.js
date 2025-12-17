import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function AnomalyTimeline({ originalData, crashData }) {
  if (!originalData || !crashData || originalData.length === 0 || crashData.length === 0) {
    return <div className="loading">No data available</div>;
  }

  // Calculate price deviation percentage for each point
  const calculateAnomalies = () => {
    const anomalies = [];
    const volumes = [];
    for (let i = 0; i < originalData.length && i < crashData.length; i++) {
      const priceDev = Math.abs(crashData[i].close - originalData[i].close) / originalData[i].close * 100;
      anomalies.push(priceDev);
      
      const volumeDev = Math.abs(crashData[i].volume - originalData[i].volume) / originalData[i].volume * 100;
      volumes.push(volumeDev);
    }
    return { anomalies, volumes };
  };

  const { anomalies, volumes } = calculateAnomalies();
  const dates = originalData.map(d => d.date);

  const chartData = {
    labels: dates,
    datasets: [
      {
        label: 'Price Deviation %',
        data: anomalies,
        borderColor: 'rgb(220, 53, 69)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        yAxisID: 'y',
      },
      {
        label: 'Volume Deviation %',
        data: volumes,
        borderColor: 'rgb(255, 193, 7)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Anomaly Timeline - Deviation from Original',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
          }
        }
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Price Deviation (%)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Volume Deviation (%)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div style={{ height: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default AnomalyTimeline;

