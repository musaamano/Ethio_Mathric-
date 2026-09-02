import React from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#9CA3AF' } },
    y: { grid: { color: '#F0F7F4' }, ticks: { font: { size: 11 }, color: '#9CA3AF' }, beginAtZero: true },
  },
};

export function LineChart({ labels, data, label = 'Score', height = 200 }) {
  const config = {
    labels,
    datasets: [{
      label,
      data,
      borderColor:     '#52B788',
      backgroundColor: 'rgba(82,183,136,0.10)',
      borderWidth:     2.5,
      pointRadius:     4,
      pointBackgroundColor: '#52B788',
      tension:         0.4,
      fill:            true,
    }],
  };
  return <div style={{ height }}><Line data={config} options={BASE_OPTIONS} /></div>;
}

export function BarChart({ labels, data, label = 'Score', height = 200 }) {
  const config = {
    labels,
    datasets: [{
      label,
      data,
      backgroundColor: data.map((_, i) => i === data.length - 1 ? '#2D6A4F' : '#B7E4C7'),
      borderRadius:    8,
      borderSkipped:   false,
    }],
  };
  return <div style={{ height }}><Bar data={config} options={BASE_OPTIONS} /></div>;
}

export function DoughnutChart({ labels, data, colors, height = 180 }) {
  const config = {
    labels,
    datasets: [{
      data,
      backgroundColor: colors || ['#52B788','#2D6A4F','#F4845F','#B7E4C7','#95D5B2'],
      borderWidth:     0,
      hoverOffset:     8,
    }],
  };
  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 10, padding: 12, color: '#6B7280' } } }, cutout: '65%' };
  return <div style={{ height }}><Doughnut data={config} options={opts} /></div>;
}

export default LineChart;
