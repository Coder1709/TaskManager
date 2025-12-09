import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import logger from '../config/logger';

interface TaskSummaryInput {
    title: string;
    status: string;
    priority: string;
    project: string;
    dueDate?: string | null;
    createdAt: string;
    updatedAt: string;
}

interface SummaryResult {
    summary: string;
    isAIGenerated: boolean;
}

class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor() {
        if (config.gemini.apiKey) {
            this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            logger.info('Gemini service initialized');
        } else {
            logger.warn('Gemini API key not configured - using fallback summaries');
        }
    }

    async generateDailySummary(
        userName: string,
        tasks: TaskSummaryInput[],
        date: Date
    ): Promise<SummaryResult> {
        const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        if (!this.model || tasks.length === 0) {
            return this.generateFallbackDailySummary(userName, tasks, dateStr);
        }

        try {
            const prompt = this.buildDailySummaryPrompt(userName, tasks, dateStr);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const summary = response.text();

            return {
                summary: summary.trim(),
                isAIGenerated: true,
            };
        } catch (error) {
            logger.error('Gemini API error for daily summary:', error);
            return this.generateFallbackDailySummary(userName, tasks, dateStr);
        }
    }

    async generateWeeklySummary(
        userName: string,
        tasks: TaskSummaryInput[],
        startDate: Date,
        endDate: Date,
        stats: { created: number; completed: number; inProgress: number; overdue: number }
    ): Promise<SummaryResult> {
        const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (!this.model || tasks.length === 0) {
            return this.generateFallbackWeeklySummary(userName, tasks, startStr, endStr, stats);
        }

        try {
            const prompt = this.buildWeeklySummaryPrompt(userName, tasks, startStr, endStr, stats);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const summary = response.text();

            return {
                summary: summary.trim(),
                isAIGenerated: true,
            };
        } catch (error) {
            logger.error('Gemini API error for weekly summary:', error);
            return this.generateFallbackWeeklySummary(userName, tasks, startStr, endStr, stats);
        }
    }

    private buildDailySummaryPrompt(userName: string, tasks: TaskSummaryInput[], dateStr: string): string {
        const taskList = tasks
            .map((t) => `- "${t.title}" (${t.status}, ${t.priority} priority, Project: ${t.project})`)
            .join('\n');

        return `You are a helpful project management assistant. Generate a brief, professional daily summary (max 150 words) for ${userName} about their tasks on ${dateStr}.

Tasks:
${taskList}

Write a natural, encouraging summary that:
1. Highlights key accomplishments or focus areas
2. Mentions any high-priority or overdue tasks
3. Provides a positive yet realistic overview
4. Uses professional but friendly tone

Do not use bullet points or lists. Write in flowing paragraphs.`;
    }

    private buildWeeklySummaryPrompt(
        userName: string,
        tasks: TaskSummaryInput[],
        startStr: string,
        endStr: string,
        stats: { created: number; completed: number; inProgress: number; overdue: number }
    ): string {
        const taskList = tasks
            .slice(0, 30) // Limit to avoid token limits
            .map((t) => `- "${t.title}" (${t.status}, ${t.priority}, Project: ${t.project})`)
            .join('\n');

        return `You are a helpful project management assistant. Generate a concise weekly summary (max 200 words) for ${userName} covering ${startStr} - ${endStr}.

Weekly Stats:
- Tasks Created: ${stats.created}
- Tasks Completed: ${stats.completed}
- Tasks In Progress: ${stats.inProgress}
- Overdue Tasks: ${stats.overdue}

Notable Tasks:
${taskList}

Write a natural, insightful summary that:
1. Celebrates completed work and productivity trends
2. Identifies areas needing attention (overdue items)
3. Provides encouragement and actionable insights
4. Compares workload balance (created vs completed)

Do not use bullet points or lists. Write in flowing paragraphs with a professional but motivating tone.`;
    }

    private generateFallbackDailySummary(
        userName: string,
        tasks: TaskSummaryInput[],
        dateStr: string
    ): SummaryResult {
        const completed = tasks.filter((t) => t.status === 'DONE').length;
        const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
        const highPriority = tasks.filter((t) => t.priority === 'HIGH' || t.priority === 'CRITICAL').length;

        let summary = `Here's your daily summary for ${dateStr}. `;

        if (tasks.length === 0) {
            summary += `You have no tasks assigned for today. Consider reviewing your backlog or checking in with your team.`;
        } else {
            summary += `You have ${tasks.length} total task${tasks.length === 1 ? '' : 's'}. `;
            if (completed > 0) {
                summary += `Great work completing ${completed} task${completed === 1 ? '' : 's'}! `;
            }
            if (inProgress > 0) {
                summary += `${inProgress} task${inProgress === 1 ? ' is' : 's are'} currently in progress. `;
            }
            if (highPriority > 0) {
                summary += `Note: ${highPriority} high-priority task${highPriority === 1 ? '' : 's'} need${highPriority === 1 ? 's' : ''} attention.`;
            }
        }

        return {
            summary,
            isAIGenerated: false,
        };
    }

    private generateFallbackWeeklySummary(
        userName: string,
        tasks: TaskSummaryInput[],
        startStr: string,
        endStr: string,
        stats: { created: number; completed: number; inProgress: number; overdue: number }
    ): SummaryResult {
        let summary = `Weekly summary for ${startStr} - ${endStr}. `;

        if (stats.completed > 0) {
            summary += `You completed ${stats.completed} task${stats.completed === 1 ? '' : 's'} this week - nice work! `;
        }

        if (stats.created > 0) {
            summary += `${stats.created} new task${stats.created === 1 ? ' was' : 's were'} created. `;
        }

        if (stats.inProgress > 0) {
            summary += `${stats.inProgress} task${stats.inProgress === 1 ? ' is' : 's are'} currently in progress. `;
        }

        if (stats.overdue > 0) {
            summary += `Heads up: ${stats.overdue} task${stats.overdue === 1 ? ' is' : 's are'} overdue and may need immediate attention. `;
        }

        if (stats.completed === 0 && tasks.length > 0) {
            summary += `Focus on completing in-progress tasks to maintain momentum.`;
        } else if (tasks.length === 0) {
            summary += `No active tasks this week. Check your project backlogs for upcoming work.`;
        }

        return {
            summary,
            isAIGenerated: false,
        };
    }
}

export const geminiService = new GeminiService();
