/** 项目导读：赛事工具的输入边界和 AI 返回结构集中校验；模型很能聊，入库前仍要查证件。 */
import { z } from "zod";

export const confidenceSchema = z.enum(["high", "medium", "low"]);

export const eventSchema = z.object({
  id: z.string().min(1).max(100),
  date: z.string().max(10).nullable(),
  time: z.string().max(5).nullable(),
  event: z.string().trim().max(200),
  stage: z.string().trim().max(100).nullable(),
  location: z.string().trim().max(200).nullable(),
  sourceFile: z.string().trim().max(255),
  sourcePage: z.number().int().positive(),
  sourceText: z.string().trim().max(10_000),
  confidence: confidenceSchema
});

export const aiEventSchema = eventSchema.omit({ id: true }).extend({
  event: z.string().trim().min(1).max(200),
  sourceFile: z.string().trim().min(1).max(255),
  sourcePage: z.number().int().positive(),
  sourceText: z.string().trim().min(1).max(10_000)
});

export const aiExtractionSchema = z.object({
  suggestedTitle: z.string().trim().max(100).catch(""),
  events: z.array(aiEventSchema).max(1000)
});

export const scheduleGroupSchema = z.object({
  id: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  name: z.string().trim().min(1).max(100),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  eventIds: z.array(z.string().min(1)).min(1)
});

export const exportRequestSchema = z.object({
  title: z.string().trim().max(100).optional().default(""),
  events: z.array(eventSchema).min(1).max(1000),
  groups: z.array(scheduleGroupSchema).min(1).max(500)
});
