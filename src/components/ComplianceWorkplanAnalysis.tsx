import React, { useState, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import * as XLSX from 'xlsx';

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

interface ProcessedData {
  monthlyData: { month: string; activities: number }[];
  quarterlyData: { quarter: string; activities: number }[];
  topicData: { topic: string; activities: number; avgCompletion: number; element: ComplianceElement }[];
  goalData: { goal: string; activities: number; avgCompletion: number }[];
  statusData: { name: string; value: number; percentage: number }[];
  complianceMaturity: { element: string; score: number; activities: number; completion: number }[];
  summary: {
    totalActivities: number;
    avgCompletion: number;
    completedActivities: number;
    inProgressActivities: number;
    notStartedActivities: number;
  };
}

const ComplianceWorkplanAnalysis: React.FC = () => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

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
    const completedActivities = activities.filter(a => a.Percent_Complete >= 1).length;
    const inProgressActivities = activities.filter(a => a.Percent_Complete > 0 && a.Percent_Complete < 1).length;
    const notStartedActivities = activities.filter(a => a.Percent_Complete === 0).length;
    
    // Status distribution
    const statusData = [
      { name: 'Completed', value: completedActivities, percentage: Math.round((completedActivities / totalActivities) * 100) },
      { name: 'In Progress', value: inProgressActivities, percentage: Math.round((inProgressActivities / totalActivities) * 100) },
      { name: 'Not Started', value: notStartedActivities, percentage: Math.round((notStartedActivities / totalActivities) * 100) }
    ];
    
    return {
      monthlyData,
      quarterlyData,
      topicData,
      goalData,
      statusData,
      complianceMaturity,
      summary: {
        totalActivities,
        avgCompletion,
        completedActivities,
        inProgressActivities,
        notStartedActivities
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
      
      // Process By Department sheet
      const deptSheet = workbook.Sheets['WP By Department'];
      if (deptSheet) {
        const deptData = XLSX.utils.sheet_to_json(deptSheet, { header: 1 }) as any[][];
        
        for (let i = 3; i < deptData.length; i++) {
          const row = deptData[i];
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
              Sheet: 'By Department',
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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

      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Executive Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Activities</p>
            <p className="text-3xl font-bold text-blue-600">{data.summary.totalActivities}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Average Completion</p>
            <p className="text-3xl font-bold text-green-600">{data.summary.avgCompletion}%</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Activities Completed</p>
            <p className="text-3xl font-bold text-purple-600">{data.summary.completedActivities}</p>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Activity Status Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percentage}) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-medium mb-3">Key Insights</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                {data.statusData[0].value} activities completed ({data.statusData[0].percentage}%)
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                {data.statusData[1].value} activities in progress ({data.statusData[1].percentage}%)
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                {data.statusData[2].value} activities not yet started ({data.statusData[2].percentage}%)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Compliance Program Maturity Assessment */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Compliance Program Maturity Assessment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={data.complianceMaturity}>
              <PolarGrid />
              <PolarAngleAxis dataKey="element" className="text-xs" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
              <Radar
                name="Maturity Score"
                dataKey="score"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [`${value}%`, name]}
                labelFormatter={(label: string) => `Element: ${label}`}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-medium mb-3">Maturity Breakdown</h3>
            <div className="space-y-3">
              {data.complianceMaturity.slice(0, 4).map((element, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{element.element}</div>
                    <div className="text-xs text-gray-600">{element.activities} activities, {element.completion}% complete</div>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-12 h-2 rounded-full mr-2 ${
                      element.score >= 80 ? 'bg-green-500' :
                      element.score >= 60 ? 'bg-yellow-500' :
                      element.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium">{element.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Maturity Scoring Methodology</h4>
          <p className="text-sm text-blue-700">
            Maturity scores are calculated based on activity coverage (0-50 points) and completion rate (0-50 points). 
            Scores above 80% indicate mature processes, 60-79% developing, 40-59% basic, and below 40% need attention.
          </p>
        </div>
      </div>

      {/* Timeline Analysis */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
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

      {/* Quarterly Distribution */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Quarterly Activity Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.quarterlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="activities" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compliance Elements Analysis */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibent mb-4 text-gray-800">7 Basic Compliance Program Elements</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.topicData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="topic" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={(topic: string) => {
                  const element = data.topicData.find(d => d.topic === topic)?.element;
                  return element ? `${element.code}: ${element.name}` : topic;
                }}
              />
              <Bar dataKey="activities" fill="#8884d8" name="Number of Activities" />
              <Bar dataKey="avgCompletion" fill="#82ca9d" name="Avg Completion %" />
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-3">Compliance Elements Framework</h3>
            {data.topicData.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{item.element.code}: {item.element.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{item.element.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium">{item.activities} activities</div>
                    <div className="text-xs text-gray-600">{item.avgCompletion}% complete</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      item.avgCompletion >= 80 ? 'bg-green-500' :
                      item.avgCompletion >= 60 ? 'bg-yellow-500' :
                      item.avgCompletion >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${item.avgCompletion}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 p-4 bg-amber-50 rounded-lg">
          <h4 className="font-semibold text-amber-800 mb-2">🎯 Compliance Framework Overview</h4>
          <p className="text-sm text-amber-700">
            These seven elements form the foundation of an effective compliance program as outlined in federal guidance. 
            Each element should have adequate activities and show strong completion rates to demonstrate program maturity.
          </p>
        </div>
      </div>

      {/* Organizational Goals */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Alignment with Organizational Goals</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data.goalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="goal" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="activities" fill="#FFBB28" name="Number of Activities" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compliance-Specific Insights and Recommendations */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Compliance Program Insights & Recommendations</h2>
        <div className="space-y-4">
          {/* Program Balance Analysis */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-lg mb-2">📊 Program Balance Assessment</h3>
            <p className="text-gray-700">
              {(() => {
                const highestElement = data.complianceMaturity[0];
                const lowestElement = data.complianceMaturity[data.complianceMaturity.length - 1];
                const gap = highestElement.score - lowestElement.score;
                
                if (gap > 40) {
                  return `Significant imbalance detected: "${highestElement.element}" (${highestElement.score}%) significantly outperforms "${lowestElement.element}" (${lowestElement.score}%). Consider redistributing focus to achieve balanced compliance program maturity.`;
                } else if (gap > 20) {
                  return `Moderate imbalance: "${lowestElement.element}" needs attention to match the performance of stronger elements like "${highestElement.element}".`;
                } else {
                  return `Well-balanced compliance program with consistent maturity across elements. Continue maintaining this balanced approach.`;
                }
              })()} 
            </p>
          </div>
          
          {/* Critical Element Focus */}
          <div className="border-l-4 border-red-500 pl-4">
            <h3 className="font-semibold text-lg mb-2">🚨 Priority Areas Requiring Attention</h3>
            <p className="text-gray-700">
              {(() => {
                const weakElements = data.complianceMaturity.filter(e => e.score < 60);
                if (weakElements.length === 0) {
                  return "All compliance elements show strong maturity (≥60%). Maintain current performance levels.";
                } else {
                  const elementNames = weakElements.map(e => e.element).join(', ');
                  return `Critical attention needed for: ${elementNames}. These foundational elements require immediate strengthening to ensure program effectiveness.`;
                }
              })()} 
            </p>
          </div>
          
          {/* Resource Allocation */}
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold text-lg mb-2">💰 Resource Allocation Strategy</h3>
            <p className="text-gray-700">
              {(() => {
                const totalActivities = data.summary.totalActivities;
                const avgActivitiesPerElement = totalActivities / 7;
                const overAllocated = data.topicData.filter(t => t.activities > avgActivitiesPerElement * 1.5);
                const underAllocated = data.topicData.filter(t => t.activities < avgActivitiesPerElement * 0.5);
                
                if (overAllocated.length > 0 && underAllocated.length > 0) {
                  return `Resource rebalancing opportunity: ${overAllocated.map(e => e.element.name).join(', ')} have disproportionate activity allocation, while ${underAllocated.map(e => e.element.name).join(', ')} may be under-resourced.`;
                } else {
                  return `Resource allocation appears balanced across compliance elements.`;
                }
              })()} 
            </p>
          </div>
          
          {/* Timeline & Execution */}
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-lg mb-2">⏱️ Execution Performance</h3>
            <p className="text-gray-700">
              Overall completion rate of {data.summary.avgCompletion}% {data.summary.avgCompletion >= 75 ? 'demonstrates strong' : data.summary.avgCompletion >= 50 ? 'shows moderate' : 'indicates concerning'} program execution. 
              {data.summary.avgCompletion < 50 && 'Consider reviewing project management processes and resource adequacy.'}
              {data.summary.avgCompletion >= 50 && data.summary.avgCompletion < 75 && 'Focus on removing execution barriers and improving project velocity.'}
              {data.summary.avgCompletion >= 75 && 'Maintain current execution practices while ensuring quality is not compromised for speed.'}
            </p>
          </div>
          
          {/* Regulatory Readiness */}
          <div className="border-l-4 border-amber-500 pl-4">
            <h3 className="font-semibold text-lg mb-2">🛡️ Regulatory Readiness</h3>
            <p className="text-gray-700">
              {(() => {
                const criticalElements = ['Written Standards & Policies', 'Governance & Oversight', 'Audits & Evaluation'];
                const criticalScores = data.complianceMaturity.filter(e => criticalElements.includes(e.element));
                const avgCriticalScore = criticalScores.reduce((sum, e) => sum + e.score, 0) / criticalScores.length;
                
                if (avgCriticalScore >= 80) {
                  return "Strong regulatory readiness with robust foundational elements. Continue maintaining documentation and oversight processes.";
                } else if (avgCriticalScore >= 60) {
                  return "Moderate regulatory readiness. Strengthen documentation, governance oversight, and audit processes to improve examination preparedness.";
                } else {
                  return "Regulatory readiness requires immediate attention. Critical compliance infrastructure elements need strengthening before potential examinations.";
                }
              })()} 
            </p>
          </div>
          
          {/* Next Steps */}
          <div className="border-l-4 border-indigo-500 pl-4">
            <h3 className="font-semibold text-lg mb-2">🎯 Recommended Next Steps</h3>
            <div className="text-gray-700">
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li><strong>Immediate (30 days):</strong> Address elements scoring below 40% maturity</li>
                <li><strong>Short-term (90 days):</strong> Rebalance resource allocation across underperforming elements</li>
                <li><strong>Medium-term (6 months):</strong> Implement systematic monitoring of all seven compliance elements</li>
                <li><strong>Long-term (annual):</strong> Conduct comprehensive program assessment and strategic planning</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceWorkplanAnalysis;