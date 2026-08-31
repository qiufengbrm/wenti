/** 项目导读：类型定义 schedule：给数据形状立规矩；TypeScript 先把话说明白，运行时就少一点鸡同鸭讲。 */
export type ScheduleCourseData = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  courseName: string;
  details: string;
  weeks: number[];
  originalText: string;
};

export type ScheduleData = {
  id?: string;
  academicTerm: string;
  className: string;
  major: string;
  department: string;
  sourceFileName: string;
  fileSize: number;
  uploadedAt?: string;
  courses: ScheduleCourseData[];
};

export const scheduleDays = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

export const scheduleSlots = [
  { label: "第一大节", sections: "01、02 小节", startTime: "08:00", endTime: "09:40" },
  { label: "第二大节", sections: "03、04 小节", startTime: "10:10", endTime: "11:50" },
  { label: "第三大节", sections: "05、06 小节", startTime: "14:00", endTime: "15:40" },
  { label: "第四大节", sections: "07、08 小节", startTime: "16:10", endTime: "17:50" },
  { label: "第五大节", sections: "09、10 小节", startTime: "18:30", endTime: "20:05" },
  { label: "第六大节", sections: "11、12 小节", startTime: "20:15", endTime: "21:50" }
];
