import React, { useState, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { GaugeDashboard } from './GaugeComponents';

interface Activity {
  Topic: string;
  Activity: string;
  Org_Goal: string;
  Coordinating_Partner: string;
  Timeline: {
    Jan: boolean; Feb: boolean; Mar: boolean; Apr: boolean;
    May: boolean; Jun: boolean; Jul: boolean; Aug: boolean;
    Sep: boolean; Oct: boolean; Nov: boolean; Dec: boolean;
  };
  Percent_Complete: number;
  Status: string;
  Sheet: string;
  Q1: boolean;
  Q2: boolean;
  Q3: boolean;
  Q4: boolean;
}

interface ComplianceElement {
  code: string;
  name: string;
  description: string;
}

interface StatusCategory {
  name: string;
  color: string;
  description: string;
}

interface ProcessedData {
  monthlyData: { month: string; activities: number }[];
  quarterlyData: { quarter: string; activities: number }[];
  topicData: { topic: string; activities: number; avgCompletion: number; element: ComplianceElement }[];
  goalData: { goal: string; activities: number; avgCompletion: number }[];
  statusData: { name: string; value: number; percentage: number; color: string }[];
  complianceMaturity: { element: string; score: number; activities: number; completion: number }[];
  executiveSummary: {
    narrative: string;
    keyInsights: string[];
    riskAreas: string[];
    successes: string[];
  };
  summary: {
    totalActivities: number;
    avgCompletion: number;
    ongoingActivities: number;
    onTrackActivities: number;
    completeActivities: number;
    delayedActivities: number;
  };
}

const ComplianceWorkplanAnalysis: React.FC = () => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isMaturityExpanded, setIsMaturityExpanded] = useState(false);

  // Compliance Program Elements Framework
  const complianceElements: Record<string, ComplianceElement> = {
    'E1': {
      code: 'E1',
      name: 'Written Standards & Policies',
      description: 'Written standards of conduct and policies and procedures'
    },
    'E2': {
      code: 'E2', 
      name: 'Governance & Oversight',
      description: 'Designation of a Chief Compliance Officer and other appropriate bodies'
    },
    'E3': {
      code: 'E3',
      name: 'Education & Training', 
      description: 'Effective education & training programs'
    },
    'E4': {
      code: 'E4',
      name: 'Audits & Evaluation',
      description: 'Audits and evaluation techniques to monitor compliance'
    },
    'E5': {
      code: 'E5',
      name: 'Reporting & Background Checks',
      description: 'Establishment of reporting processes, background checks and procedures for complaints'
    },
    'E6': {
      code: 'E6',
      name: 'Disciplinary Mechanisms',
      description: 'Appropriate disciplinary mechanisms'
    },
    'E7': {
      code: 'E7',
      name: 'Response & Remediation',
      description: 'Response, remediation and prevention'
    }
  };

  // Status Legend Mapping (Numeric)
  const statusCategories: Record<string, StatusCategory> = {
    '1': {
      name: 'Ongoing',
      color: '#6B7280', // Gray
      description: 'Activities that are ongoing without specific timeline completion'
    },
    '2': {
      name: 'On Track',
      color: '#3B82F6', // Blue
      description: 'Activities progressing as planned within timeline'
    },
    '3': {
      name: 'Complete',
      color: '#10B981', // Green
      description: 'Activities that have been completed'
    },
    '4': {
      name: 'Delayed',
      color: '#F59E0B', // Yellow
      description: 'Activities that are behind schedule'
    }
  };

  // Helper function to normalize status values
  const normalizeStatus = (status: string | number): string => {
    if (!status) return '1'; // Default to Ongoing
    
    const statusStr = status.toString().trim();
    
    // Direct numeric matches
    if (statusCategories[statusStr]) return statusStr;
    
    // Handle string values and convert to numbers
    if (typeof status === 'string') {
      const cleanStatus = status.toLowerCase();
      if (cleanStatus.includes('complete') || cleanStatus === '3') return '3';
      if (cleanStatus.includes('track') || cleanStatus.includes('on track') || cleanStatus === '2') return '2';
      if (cleanStatus.includes('delay') || cleanStatus.includes('off') || cleanStatus === '4') return '4';
    }
    
    return '1'; // Default to Ongoing
  };

  const processActivitiesData = (activities: Activity[]): ProcessedData => {
    // Monthly distribution
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map(month => ({
      month,
      activities: activities.filter(a => a.Timeline[month as keyof typeof a.Timeline]).length
    }));
    
    // Quarterly distribution
    const quarterlyData = [
      { quarter: 'Q1', activities: activities.filter(a => a.Q1).length },
      { quarter: 'Q2', activities: activities.filter(a => a.Q2).length },
      { quarter: 'Q3', activities: activities.filter(a => a.Q3).length },
      { quarter: 'Q4', activities: activities.filter(a => a.Q4).length }
    ];
    
    // Group by topic and calculate completion
    const topicGroups: Record<string, { activities: number; totalCompletion: number }> = {};
    activities.forEach(activity => {
      const topic = activity.Topic || 'Uncategorized';
      if (!topicGroups[topic]) {
        topicGroups[topic] = { activities: 0, totalCompletion: 0 };
      }
      topicGroups[topic].activities++;
      topicGroups[topic].totalCompletion += activity.Percent_Complete;
    });
    
    const topicData = Object.entries(topicGroups)
      .filter(([topic]) => topic.startsWith('E'))
      .map(([topic, data]) => {
        const element = complianceElements[topic] || {
          code: topic,
          name: topic,
          description: 'Unknown compliance element'
        };
        return {
          topic,
          activities: data.activities,
          avgCompletion: Math.round((data.totalCompletion / data.activities) * 100),
          element
        };
      })
      .sort((a, b) => b.activities - a.activities);

    // Compliance Maturity Assessment
    const complianceMaturity = Object.entries(complianceElements).map(([code, element]) => {
      const elementActivities = activities.filter(a => a.Topic === code);
      const totalCompletion = elementActivities.reduce((sum, a) => sum + a.Percent_Complete, 0);
      const avgCompletion = elementActivities.length > 0 ? totalCompletion / elementActivities.length : 0;
      
      // Calculate maturity score (0-100) based on activity count and completion
      const activityScore = Math.min((elementActivities.length / 5) * 50, 50); // Max 50 points for having activities
      const completionScore = avgCompletion * 50; // Max 50 points for completion
      const score = Math.round(activityScore + completionScore);
      
      return {
        element: element.name,
        score,
        activities: elementActivities.length,
        completion: Math.round(avgCompletion * 100)
      };
    }).sort((a, b) => b.score - a.score);
    
    // Group by organizational goal
    const goalGroups: Record<string, { activities: number; totalCompletion: number }> = {};
    activities.forEach(activity => {
      let goal = activity.Org_Goal || 'Not Specified';
      // Clean up goal names
      goal = goal.split('\r\n')[0].trim();
      if (!goalGroups[goal]) {
        goalGroups[goal] = { activities: 0, totalCompletion: 0 };
      }
      goalGroups[goal].activities++;
      goalGroups[goal].totalCompletion += activity.Percent_Complete;
    });
    
    const goalData = Object.entries(goalGroups)
      .filter(([goal]) => goal !== 'Not Specified' && goal !== '')
      .map(([goal, data]) => ({
        goal: goal.length > 30 ? goal.substring(0, 30) + '...' : goal,
        activities: data.activities,
        avgCompletion: Math.round((data.totalCompletion / data.activities) * 100)
      }))
      .sort((a, b) => b.activities - a.activities);
    
    // Overall statistics
    const totalActivities = activities.length;
    const avgCompletion = Math.round((activities.reduce((sum, a) => sum + a.Percent_Complete, 0) / totalActivities) * 100);
    
    // Status distribution based on color legend
    const statusGroups: Record<string, number> = {};
    activities.forEach(activity => {
      const normalizedStatus = normalizeStatus(activity.Status);
      statusGroups[normalizedStatus] = (statusGroups[normalizedStatus] || 0) + 1;
    });
    
    const statusData = Object.entries(statusCategories).map(([key, category]) => ({
      name: category.name,
      value: statusGroups[key] || 0,
      percentage: Math.round(((statusGroups[key] || 0) / totalActivities) * 100),
      color: category.color
    })).filter(item => item.value > 0); // Only show categories that have activities
    
    // Individual status counts
    const ongoingActivities = statusGroups['1'] || 0;
    const onTrackActivities = statusGroups['2'] || 0;
    const completeActivities = statusGroups['3'] || 0;
    const delayedActivities = statusGroups['4'] || 0;
    
    // Generate Executive Summary for Board
    const generateExecutiveSummary = () => {
      const completionRate = Math.round((completeActivities / totalActivities) * 100);
      const onTrackRate = Math.round((onTrackActivities / totalActivities) * 100);
      const delayedRate = Math.round((delayedActivities / totalActivities) * 100);
      const riskThreshold = 20; // 20% or more delayed is high risk
      
      // Risk assessment
      const riskLevel = delayedRate >= riskThreshold ? 'HIGH' : delayedRate >= 10 ? 'MODERATE' : 'LOW';
      
      // Identify weak compliance areas
      const weakElements = complianceMaturity.filter(e => e.score < 60);
      const strongElements = complianceMaturity.filter(e => e.score >= 80);
      
      const narrative = `As of ${new Date().toLocaleDateString()}, the organization's FY 2025 Compliance & Ethics program encompasses ${totalActivities} planned activities across the seven fundamental compliance elements. Current execution shows ${completionRate}% of activities completed, with ${onTrackRate}% progressing on schedule. ${delayedRate > 0 ? `${delayedRate}% of activities are experiencing delays, indicating ${riskLevel.toLowerCase()} operational risk.` : 'No significant delays are currently impacting the program timeline.'} The compliance program demonstrates ${strongElements.length > weakElements.length ? 'strong overall maturity' : 'developing maturity'} with ${strongElements.length} elements showing advanced implementation and ${weakElements.length} requiring focused attention.`;
      
      const keyInsights = [
        `Program execution is ${completionRate >= 75 ? 'exceeding' : completionRate >= 50 ? 'meeting' : 'below'} expectations with ${completionRate}% completion rate`,
        `${onTrackActivities + completeActivities} of ${totalActivities} activities (${Math.round(((onTrackActivities + completeActivities) / totalActivities) * 100)}%) are performing as planned`,
        `Compliance maturity varies significantly across elements, with scores ranging from ${Math.min(...complianceMaturity.map(e => e.score))}% to ${Math.max(...complianceMaturity.map(e => e.score))}%`
      ];
      
      const riskAreas = [
        ...(delayedRate >= riskThreshold ? [`${delayedRate}% of activities are delayed, creating program delivery risk`] : []),
        ...(weakElements.length > 0 ? [weakElements.map(e => e.element).join(', ') + ' show insufficient maturity for regulatory readiness'] : []),
        ...(avgCompletion < 50 ? ['Overall program velocity may jeopardize annual compliance objectives'] : [])
      ];
      
      const successes = [
        ...(completionRate >= 25 ? [`${completeActivities} activities successfully completed demonstrating program execution capability`] : []),
        ...(strongElements.length > 0 ? [strongElements.map(e => e.element).join(', ') + ' demonstrate mature compliance processes'] : []),
        ...(onTrackRate >= 30 ? [`${onTrackRate}% of activities maintain timeline adherence showing effective project management`] : [])
      ];
      
      return {
        narrative,
        keyInsights: keyInsights.slice(0, 3),
        riskAreas: riskAreas.length > 0 ? riskAreas.slice(0, 3) : ['No significant risks identified in current reporting period'],
        successes: successes.length > 0 ? successes.slice(0, 3) : ['Program foundation established with structured approach to compliance management']
      };
    };
    
    const executiveSummary = generateExecutiveSummary();
    
    return {
      monthlyData,
      quarterlyData,
      topicData,
      goalData,
      statusData,
      complianceMaturity,
      executiveSummary,
      summary: {
        totalActivities,
        avgCompletion,
        ongoingActivities,
        onTrackActivities,
        completeActivities,
        delayedActivities
      }
    };
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      
      let allActivities: Activity[] = [];
      
      // Process Workplan sheet
      const workplanSheet = workbook.Sheets['Workplan'];
      if (workplanSheet) {
        const workplanData = XLSX.utils.sheet_to_json(workplanSheet, { header: 1 }) as any[][];
        
        for (let i = 3; i < workplanData.length; i++) {
          const row = workplanData[i];
          if (row[1] && row[1].toString().trim() !== '') {
            const activity: Activity = {
              Topic: row[0] || '',
              Activity: row[1],
              Org_Goal: row[2] || '',
              Coordinating_Partner: row[3] || '',
              Timeline: {
                Jan: row[4] === 'x', Feb: row[5] === 'x', Mar: row[6] === 'x',
                Apr: row[7] === 'x', May: row[8] === 'x', Jun: row[9] === 'x',
                Jul: row[10] === 'x', Aug: row[11] === 'x', Sep: row[12] === 'x',
                Oct: row[13] === 'x', Nov: row[14] === 'x', Dec: row[15] === 'x'
              },
              Percent_Complete: typeof row[16] === 'number' ? row[16] : 0,
              Status: row[17] || '',
              Sheet: 'Workplan',
              Q1: false,
              Q2: false,
              Q3: false,
              Q4: false
            };
            
            activity.Q1 = activity.Timeline.Jan || activity.Timeline.Feb || activity.Timeline.Mar;
            activity.Q2 = activity.Timeline.Apr || activity.Timeline.May || activity.Timeline.Jun;
            activity.Q3 = activity.Timeline.Jul || activity.Timeline.Aug || activity.Timeline.Sep;
            activity.Q4 = activity.Timeline.Oct || activity.Timeline.Nov || activity.Timeline.Dec;
            
            allActivities.push(activity);
          }
        }
      }
      
      if (allActivities.length === 0) {
        throw new Error('No valid activities found in the uploaded file');
      }

      // Process data for visualizations
      const processedData = processActivitiesData(allActivities);
      setData(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Processing workplan data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h2 className="text-lg font-semibold mb-2">Error loading data</h2>
          <p>{error}</p>
        </div>
        <div className="mt-4">
          <label className="block">
            <span className="sr-only">Choose file</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </label>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">
            FY 2025 Compliance & Ethics Workplan Analysis
          </h1>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Upload Your Workplan File</h2>
            <p className="text-gray-600 mb-6">
              Please upload your Excel workplan file to generate the compliance analysis dashboard.
            </p>
            <label className="block">
              <span className="sr-only">Choose file</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            FY 2025 Compliance & Ethics Workplan Analysis
          </h1>
          <p className="text-lg text-gray-600">
            A comprehensive look at organizational compliance initiatives and their progress
          </p>
          {fileName && (
            <p className="text-sm text-gray-500 mt-2">
              Data source: {fileName}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* Presentation Mode Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="presentationMode"
              checked={isPresentationMode}
              onChange={(e) => setIsPresentationMode(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="presentationMode" className="text-sm text-gray-700">
              Presentation Mode
            </label>
          </div>
          
          {/* File Upload */}
          <div>
            <label className="block">
              <span className="sr-only">Update file</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Gauge Dashboard Section */}
      <GaugeDashboard
        overallCompletion={data.summary.avgCompletion}
        complianceMaturity={data.complianceMaturity}
        summary={data.summary}
        complianceElements={complianceElements}
        isPresentationMode={isPresentationMode}
      />

      {/* Board-Level Executive Summary */}
      <div className={`bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-500 ${isPresentationMode ? 'hidden' : ''}`}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">📊 Executive Summary for Board Review</h2>
        
        {/* Executive Narrative */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Program Overview</h3>
          <p className="text-gray-700 leading-relaxed">{data.executiveSummary.narrative}</p>
        </div>
        
        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Total Activities</p>
            <p className="text-3xl font-bold text-blue-600">{data.summary.totalActivities}</p>
            <p className="text-xs text-gray-500">Planned Initiatives</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Complete</p>
            <p className="text-3xl font-bold text-green-600">{data.summary.completeActivities}</p>
            <p className="text-xs text-gray-500">{Math.round((data.summary.completeActivities/data.summary.totalActivities)*100)}% of Total</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">On Track</p>
            <p className="text-3xl font-bold text-blue-600">{data.summary.onTrackActivities}</p>
            <p className="text-xs text-gray-500">{Math.round((data.summary.onTrackActivities/data.summary.totalActivities)*100)}% of Total</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Delayed</p>
            <p className="text-3xl font-bold text-yellow-600">{data.summary.delayedActivities}</p>
            <p className="text-xs text-gray-500">{Math.round((data.summary.delayedActivities/data.summary.totalActivities)*100)}% of Total</p>
          </div>
        </div>
        
      </div>

      {/* Status Distribution - Bar Chart */}
      <div className={`bg-white rounded-lg shadow-lg p-6 mb-8 ${isPresentationMode ? 'hidden' : ''}`}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Activity Status Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value: number) => `${value} activities`} />
            <Bar dataKey="value" name="Activities">
              {data.statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-4 gap-4">
          {data.statusData.map((status, index) => (
            <div key={index} className="flex items-center">
              <span 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: status.color }}
              ></span>
              <span className="text-sm text-gray-700">{status.name}: {status.value} ({status.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>


      {/* Timeline Analysis */}
      <div className={`bg-white rounded-lg shadow-lg p-6 mb-8 ${isPresentationMode ? 'hidden' : ''}`}>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Activity Timeline Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="activities" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Scheduled Activities"
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-600 mt-4">
          <strong>Observation:</strong> Activity scheduling shows patterns that may indicate resource planning needs.
        </p>
      </div>




      {/* Compliance Program Maturity by Element - Expandable */}
      <div className={`bg-white rounded-lg shadow-lg p-6 ${isPresentationMode ? 'hidden' : ''}`}>
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setIsMaturityExpanded(!isMaturityExpanded)}
        >
          <h2 className="text-2xl font-semibold text-gray-800">Compliance Program Maturity by Element</h2>
          <button className="text-gray-600 hover:text-gray-800 transition-colors">
            {isMaturityExpanded ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
        
        {isMaturityExpanded && (
          <div className="mt-6">
            <GaugeDashboard
              overallCompletion={data.summary.avgCompletion}
              complianceMaturity={data.complianceMaturity}
              summary={data.summary}
              complianceElements={complianceElements}
              isPresentationMode={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceWorkplanAnalysis;