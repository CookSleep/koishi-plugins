/**
 * 好感度 Schema
 * 定义好感度相关的配置项
 */

import { Schema } from "koishi";
import { BASE_AFFINITY_DEFAULTS } from "../constants";

const AffinityDynamicsSchema = Schema.object({
  shortTerm: Schema.object({
    promoteThreshold: Schema.number()
      .default(15)
      .description("短期好感达到该值后，增加长期好感"),
    demoteThreshold: Schema.number()
      .default(-10)
      .description("短期好感低于该值后，减少长期好感"),
    longTermPromoteStep: Schema.number()
      .default(3)
      .min(1)
      .description("每次增加的长期好感值"),
    longTermDemoteStep: Schema.number()
      .default(5)
      .min(1)
      .description("每次减少的长期好感值"),
  })
    .default({
      promoteThreshold: 15,
      demoteThreshold: -10,
      longTermPromoteStep: 3,
      longTermDemoteStep: 5,
    })
    .description("短期与长期好感设置")
    .collapse(),
  actionWindow: Schema.object({
    windowHours: Schema.number()
      .default(24)
      .min(1)
      .description("统计近期互动的时间窗口，单位为小时"),
    increaseBonus: Schema.number()
      .default(2)
      .description("当近期正向互动占优时，额外增加的好感度"),
    decreaseBonus: Schema.number()
      .default(2)
      .description("当近期负向互动占优时，额外减少的好感度"),
    bonusChatThreshold: Schema.number()
      .default(10)
      .min(0)
      .description("互动次数达到该值后，才启用额外增减效果"),
    maxEntries: Schema.number()
      .default(80)
      .min(10)
      .description("时间窗口内最多保留的互动记录数"),
  })
    .default({
      windowHours: 24,
      increaseBonus: 2,
      decreaseBonus: 2,
      bonusChatThreshold: 10,
      maxEntries: 80,
    })
    .description("近期互动权重设置")
    .collapse(),
  coefficient: Schema.object({
    base: Schema.number().default(1).description("好感度变化的基础系数"),
    maxDrop: Schema.number()
      .default(0.3)
      .min(0)
      .description("在长期冷淡或负向互动占优时，系数最多可下调的幅度"),
    maxBoost: Schema.number()
      .default(0.3)
      .min(0)
      .description("在持续互动且正向互动占优时，系数最多可上调的幅度"),
    decayPerDay: Schema.number()
      .default(0.05)
      .min(0)
      .description("每经过一天冷淡期或负向占优期时，系数的下调幅度"),
    boostPerDay: Schema.number()
      .default(0.05)
      .min(0)
      .description("每经过一天稳定互动且正向占优时，系数的上调幅度"),
  })
    .default({
      base: 1,
      maxDrop: 0.3,
      maxBoost: 0.3,
      decayPerDay: 0.05,
      boostPerDay: 0.05,
    })
    .description("好感度变化系数")
    .collapse(),
}).description("好感度动态调节");

export const AffinitySchema = Schema.object({
  affinityEnabled: Schema.boolean().default(true).description("启用好感度系统"),
  affinityDisplayRange: Schema.number()
    .default(1)
    .min(1)
    .step(1)
    .description("显示当前上下文中多少位用户的好感度信息"),
  initialAffinity: Schema.number()
    .default(BASE_AFFINITY_DEFAULTS.initialAffinity)
    .description("初始长期好感度默认值"),
  affinityDynamics: AffinityDynamicsSchema.default({
    shortTerm: {
      promoteThreshold: 15,
      demoteThreshold: -10,
      longTermPromoteStep: 3,
      longTermDemoteStep: 5,
    },
    actionWindow: {
      windowHours: 24,
      increaseBonus: 2,
      decreaseBonus: 2,
      bonusChatThreshold: 10,
      maxEntries: 80,
    },
    coefficient: {
      base: 1,
      maxDrop: 0.3,
      maxBoost: 0.3,
      decayPerDay: 0.05,
      boostPerDay: 0.05,
    },
  }).collapse(),
  rankDefaultLimit: Schema.number()
    .default(10)
    .min(1)
    .max(50)
    .description("好感度排行默认展示人数"),
}).description("好感度设置");
