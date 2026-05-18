import { Task } from '../types';

/**
 * Demo data for the Gantt planner — loaded client-side.
 * Dates are relative to today so the demo is always relevant.
 */
export function generateDemoTasks(): Task[] {
  const today = new Date();
  const d = (offsetDays: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
  };

  return [
    {
      id: '1', name: 'Project Kickoff', description: 'Initial planning meeting',
      start_date: d(1), end_date: d(1), progress: 0, type: 'milestone',
      dependencies: [], assignee: 'PM', project: 'Demo',
    },
    {
      id: '2', name: 'Requirements Gathering', description: 'Collect stakeholder needs',
      start_date: d(2), end_date: d(8), progress: 0, type: 'task',
      dependencies: ['1'], assignee: 'Analyst', project: 'Demo',
    },
    {
      id: '3', name: 'System Design', description: 'Architecture & tech stack',
      start_date: d(9), end_date: d(18), progress: 0, type: 'task',
      dependencies: ['2'], assignee: 'Architect', project: 'Demo',
    },
    {
      id: '4', name: 'UI/UX Design', description: 'Wireframes & prototypes',
      start_date: d(9), end_date: d(16), progress: 0, type: 'task',
      dependencies: [], assignee: 'Designer', project: 'Demo',
    },
    {
      id: '5', name: 'Backend Development', description: 'API & business logic',
      start_date: d(19), end_date: d(44), progress: 0, type: 'task',
      dependencies: ['3'], assignee: 'Backend Dev', project: 'Demo',
    },
    {
      id: '6', name: 'Frontend Development', description: 'Web interface',
      start_date: d(17), end_date: d(40), progress: 0, type: 'task',
      dependencies: ['4'], assignee: 'Frontend Dev', project: 'Demo',
    },
    {
      id: '7', name: 'Integration Testing', description: 'End-to-end QA',
      start_date: d(45), end_date: d(52), progress: 0, type: 'task',
      dependencies: ['5', '6'], assignee: 'QA', project: 'Demo',
    },
    {
      id: '8', name: 'Performance Tuning', description: 'Load testing & optimization',
      start_date: d(53), end_date: d(58), progress: 0, type: 'task',
      dependencies: ['7'], assignee: 'DevOps', project: 'Demo',
    },
    {
      id: '9', name: 'Security Audit', description: 'Penetration testing & review',
      start_date: d(53), end_date: d(60), progress: 0, type: 'task',
      dependencies: ['7'], assignee: 'Security', project: 'Demo',
    },
    {
      id: '10', name: 'Documentation', description: 'User guides & API docs',
      start_date: d(45), end_date: d(58), progress: 0, type: 'task',
      dependencies: ['5'], assignee: 'Tech Writer', project: 'Demo',
    },
    {
      id: '11', name: 'UAT & Sign-off', description: 'User acceptance testing',
      start_date: d(61), end_date: d(66), progress: 0, type: 'task',
      dependencies: ['8', '9', '10'], assignee: 'PM', project: 'Demo',
    },
    {
      id: '12', name: 'Go Live', description: 'Production deployment',
      start_date: d(67), end_date: d(67), progress: 0, type: 'milestone',
      dependencies: ['11'], assignee: 'DevOps', project: 'Demo',
    },
  ];
}
