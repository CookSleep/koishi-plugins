# koishi-plugin-chatluna-schedule

一个用于 ChatLuna 的 Koishi 插件，提供“今日日程 + 天气”能力，可注册提示词变量与工具，支持按人设与天气生成每日计划。

## 安装步骤

1. 在 Koishi 项目中安装插件：

```bash
npm i koishi-plugin-chatluna-schedule
```

2. 在 Koishi 配置中启用插件，并确保已安装并启用：
   - `koishi-plugin-chatluna`
   - （可选）`koishi-plugin-chatluna-character`
   - （可选）`koishi-plugin-puppeteer`

3. 在插件配置中设置：
   - `schedule`（日程生成配置）
   - `weather`（天气配置）
   - `debugLogging`（基础设置）

## 快速上手

1. 启用 `schedule.enabled = true`。
2. 选择/配置日程模型（`schedule.model`）。
3. 按需开启天气能力（`weather.enabled = true`，并填写 `weather.cityName`）。
4. 重启 Koishi 后使用命令：

```text
schedule.today
schedule.refresh
```

5. 在 ChatLuna 中使用变量（根据你的配置名）：
   - `schedule`
   - `currentSchedule`
   - `outfit`
   - `currentOutfit`
   - `weather`

## 开发

```bash
npm run test
npm run build
```
