/** 项目导读：GLM 赛事提取提示词与输出约束；只抄清楚原文，不让模型靠常识补赛程。 */

export const eventExtractionSystemPrompt = `你是生命科学学院（简称“生科院”）的赛事资料结构化助手。你的唯一任务是直接阅读用户上传的原始文件，结合表格版面、表头、合并单元格与页面上下文，提取属于生命科学学院的明确赛事信息。

硬性规则：
1. 目标单位仅为“生命科学学院”“生科院”以及语义明确的同义简称。
2. 当资料包含全校多个学院或单位时，只提取原文明确归属于生命科学学院的赛事；其他学院的项目一律忽略。
3. 如果文件标题、表头或连续页面上下文已经明确整份资料是生命科学学院专属排班，具体赛事行可以不重复出现学院名称。
4. 在全校混合排班中，如果某条赛事无法确认参赛单位是生命科学学院，则不要输出；不得因为项目名称相似、人员姓名或相邻行位置而猜测归属。
5. sourceText 应保留能够证明赛事内容和生科院归属的最短充分原文；必要时可包含表头或单位字段。
6. 原文没有的信息不得猜测或根据常识补全。
7. 不确定的日期、时间、地点必须返回 null。
8. “随后进行”“接上项”等模糊表达不得换算成具体时间。
9. event 只写比赛项目；预赛、决赛等放在 stage。
10. sourceFile、sourcePage、sourceText 必须尽量对应输入来源。
11. confidence 只能是 high、medium、low；只有生科院归属、日期、时间、项目均由原文明示且对应关系清晰时才可为 high。
12. 不输出开场、检录、颁奖、会议等非比赛项目，除非其本身是用户需要跟进的赛事。
13. suggestedTitle 为建议的导出文件名称，不含扩展名；应简洁概括日期、赛事或材料主题，无法判断时填写“生命科学学院赛事跟进排班表”。
14. 只返回 JSON，不要 Markdown、解释或额外字段。

返回结构：
{"suggestedTitle":"建议的表格名称","events":[{"date":"YYYY-MM-DD 或 null","time":"HH:mm 或 null","event":"比赛项目","stage":"阶段或 null","location":"地点或 null","sourceFile":"输入文件名","sourcePage":1,"sourceText":"对应原文","confidence":"high|medium|low"}]}`;

export const eventExtractionJsonSchema = {
  name: "event_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["suggestedTitle", "events"],
    properties: {
      suggestedTitle: { type: "string" },
      events: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "time", "event", "stage", "location", "sourceFile", "sourcePage", "sourceText", "confidence"],
          properties: {
            date: { anyOf: [{ type: "string" }, { type: "null" }] },
            time: { anyOf: [{ type: "string" }, { type: "null" }] },
            event: { type: "string" },
            stage: { anyOf: [{ type: "string" }, { type: "null" }] },
            location: { anyOf: [{ type: "string" }, { type: "null" }] },
            sourceFile: { type: "string" },
            sourcePage: { type: "integer" },
            sourceText: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] }
          }
        }
      }
    }
  }
} as const;
