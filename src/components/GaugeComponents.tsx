import React from 'react';
import GaugeChart from 'react-gauge-chart';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface OverallCompletionGaugeProps {
  value: number; // 0-100
  title?: string;
}

interface StatusGaugeProps {
  value: number; // 0-100
  total: number;
  title: string;
  color: string;
  description?: string;
  isOngoing?: boolean;
}

interface MaturityGaugeProps {
  value: number; // 0-100
  element: {
    code: string;
    name: string;
    description: string;
  };
  activities: number;
  completion: number;
}

// Overall Program Completion Gauge
export const OverallCompletionGauge: React.FC<OverallCompletionGaugeProps> = ({ 
  value, 
  title = "Overall Program Completion" 
}) => {
  // Color zones: Red (0-40%), Yellow (40-70%), Green (70-100%)

  return (
    <div className="flex flex-col items-center">
      <div className="w-80 h-40 relative">
        <GaugeChart
          id="overall-completion-gauge"
          nrOfLevels={3}
          arcsLength={[0.4, 0.3, 0.3]}
          colors={['#EF4444', '#F59E0B', '#10B981']}
          percent={value / 100}
          arcPadding={0.02}
          cornerRadius={3}
          textColor="#374151"
          needleColor="#464A4F"
          needleBaseColor="#464A4F"
          hideText={false}
          animDelay={200}
          formatTextValue={(val: string) => `${val}%`}
          style={{ 
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}
        />
      </div>
      <div className="text-center mt-2">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">
          Activities progressing or complete: {value}%
        </p>
        <p className="text-xs text-gray-500 mt-1">
          (Ongoing + On Track + Complete)
        </p>
      </div>
    </div>
  );
};

// Status Distribution Gauge
export const StatusGauge: React.FC<StatusGaugeProps> = ({ 
  value, 
  total, 
  title, 
  color, 
  description,
  isOngoing = false
}) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border relative">
      {isOngoing && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-gray-400 opacity-30 animate-pulse"></div>
      )}
      
      <div className="w-24 h-24 mx-auto mb-3">
        <CircularProgressbar
          value={value}
          text={`${Math.round(value)}%`}
          styles={buildStyles({
            pathColor: color,
            textColor: '#374151',
            trailColor: '#E5E7EB',
            backgroundColor: '#F9FAFB',
            textSize: '16px',
            pathTransitionDuration: 1.5,
          })}
        />
      </div>
      
      <div className="text-center">
        <h4 className="font-semibold text-sm text-gray-800 mb-1">{title}</h4>
        <p className="text-xs text-gray-600 mb-1">{total} activities</p>
        {isOngoing && (
          <div className="flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-1 animate-pulse"></div>
            <span className="text-xs text-gray-600">Active & On Schedule</span>
          </div>
        )}
        {description && !isOngoing && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
};

// Compliance Element Maturity Gauge
export const MaturityGauge: React.FC<MaturityGaugeProps> = ({ 
  value, 
  element, 
  activities, 
  completion 
}) => {
  const getColorByScore = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    if (score >= 40) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  const getStatusText = (score: number) => {
    if (score >= 80) return 'Mature';
    if (score >= 60) return 'Developing';
    if (score >= 40) return 'Basic';
    return 'Needs Attention';
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-gray-800">{element.code}</h4>
          <p className="text-xs text-gray-600 truncate" title={element.name}>
            {element.name.length > 25 ? element.name.substring(0, 25) + '...' : element.name}
          </p>
        </div>
        <div className="w-16 h-16 ml-3">
          <CircularProgressbar
            value={value}
            text={`${Math.round(value)}%`}
            styles={buildStyles({
              pathColor: getColorByScore(value),
              textColor: '#374151',
              trailColor: '#E5E7EB',
              backgroundColor: '#F9FAFB',
              textSize: '14px',
              pathTransitionDuration: 1.2,
            })}
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Activities:</span>
          <span className="font-medium">{activities}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Completion:</span>
          <span className="font-medium">{completion}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Status:</span>
          <span 
            className={`font-medium ${
              value >= 80 ? 'text-green-600' :
              value >= 60 ? 'text-yellow-600' :
              value >= 40 ? 'text-orange-600' : 'text-red-600'
            }`}
          >
            {getStatusText(value)}
          </span>
        </div>
      </div>
      
      <div className="mt-2">
        <div 
          className={`h-2 rounded-full ${
            value >= 80 ? 'bg-green-500' :
            value >= 60 ? 'bg-yellow-500' :
            value >= 40 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
};

// Gauge Dashboard Section Component
interface GaugeDashboardProps {
  overallCompletion: number;
  complianceMaturity: {
    element: string;
    score: number;
    activities: number;
    completion: number;
  }[];
  summary: {
    totalActivities: number;
    ongoingActivities: number;
    onTrackActivities: number;
    completeActivities: number;
    delayedActivities: number;
  };
  complianceElements: Record<string, {
    code: string;
    name: string;
    description: string;
  }>;
  isPresentationMode?: boolean;
}

export const GaugeDashboard: React.FC<GaugeDashboardProps> = ({
  overallCompletion: _overallCompletion,
  complianceMaturity,
  summary,
  complianceElements,
  isPresentationMode = false
}) => {
  // Calculate percentages for each status
  const ongoingPercentage = Math.round((summary.ongoingActivities / summary.totalActivities) * 100);
  const onTrackPercentage = Math.round((summary.onTrackActivities / summary.totalActivities) * 100);
  const completePercentage = Math.round((summary.completeActivities / summary.totalActivities) * 100);
  const delayedPercentage = Math.round((summary.delayedActivities / summary.totalActivities) * 100);
  
  // Calculate sum of ongoing, on track, and complete percentages for the main gauge
  const progressPercentage = ongoingPercentage + onTrackPercentage + completePercentage;
  
  // Map status data to our gauge format
  const statusGauges = [
    {
      title: 'Ongoing',
      value: ongoingPercentage,
      total: summary.ongoingActivities,
      color: '#6B7280',
      isOngoing: true,
      description: 'Active & On Schedule'
    },
    {
      title: 'On Track',
      value: onTrackPercentage,
      total: summary.onTrackActivities,
      color: '#3B82F6',
      description: 'Progressing as planned'
    },
    {
      title: 'Complete',
      value: completePercentage,
      total: summary.completeActivities,
      color: '#10B981',
      description: 'Successfully finished'
    },
    {
      title: 'Delayed',
      value: delayedPercentage,
      total: summary.delayedActivities,
      color: '#F59E0B',
      description: 'Behind schedule'
    }
  ];

  // Map maturity data to elements
  const maturityGauges = complianceMaturity.map(item => {
    const elementKey = Object.keys(complianceElements).find(key => 
      complianceElements[key].name === item.element
    ) || 'E1';
    
    return {
      ...item,
      element: complianceElements[elementKey] || complianceElements['E1']
    };
  });

  return (
    <div className={`space-y-8 ${isPresentationMode ? 'p-8' : ''}`}>
      {/* Main Completion Gauge */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 text-center shadow-lg">
        <OverallCompletionGauge 
          value={progressPercentage} 
          title="FY 2025 Program Progress Status"
        />
      </div>

      {/* Status Distribution Gauges */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
          Activity Status Distribution
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusGauges.map((gauge, index) => (
            <StatusGauge
              key={index}
              value={gauge.value}
              total={gauge.total}
              title={gauge.title}
              color={gauge.color}
              description={gauge.description}
              isOngoing={gauge.isOngoing}
            />
          ))}
        </div>
      </div>

      {/* Compliance Maturity Gauges */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
          Compliance Program Maturity by Element
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {maturityGauges.slice(0, 7).map((gauge, index) => (
            <MaturityGauge
              key={index}
              value={gauge.score}
              element={gauge.element}
              activities={gauge.activities}
              completion={gauge.completion}
            />
          ))}
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Maturity Scale:</strong> 
            <span className="text-green-600 ml-2">80-100% Mature</span>
            <span className="text-yellow-600 ml-2">60-79% Developing</span>
            <span className="text-orange-600 ml-2">40-59% Basic</span>
            <span className="text-red-600 ml-2">0-39% Needs Attention</span>
          </p>
        </div>
      </div>
    </div>
  );
};