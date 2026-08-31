/** 项目导读：接口路由 /api/volunteers：先校验身份和输入，再读写数据；流程再急，门卫也不能打瞌睡。 */
import { createCrudHandlers } from "@/app/api/_utils";

export const { GET, POST, PUT, DELETE } = createCrudHandlers("volunteers", { adminOnly: true });
