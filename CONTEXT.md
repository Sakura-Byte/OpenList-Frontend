# OpenList Frontend

OpenList 的 Web 前端：浏览挂载存储里的目录与文件，以及管理后台。

## Language

**Layout（布局）**:
目录内容的展示方式，可选列表、网格、图片、海报四种；按路径记住用户的选择。
_Avoid_: 视图模式、view

**Poster layout（海报布局）**:
以封面为主体、下方完整显示标题的目录布局，用于浏览一组作品。
_Avoid_: 海报流、封面墙、poster grid

**Work（作品）**:
内容驱动里的一个条目，表现为一个带封面的文件夹，例如一部漫画专辑或一部音声作品。
_Avoid_: 专辑、album、条目

**Work code（作品编号）**:
来源站点给 **Work** 的编号，例如 ASMR.ONE 的 `RJ123456`、JMComic 的 `JM1033833`；在 **Poster layout** 里和标题分开显示。
_Avoid_: RJ号、ID、source id

**Work list（作品列表）**:
大部分项目都是 **Work** 的目录。
_Avoid_: 作品目录

**Poster provider（海报驱动）**:
其 **Work list** 会自动使用 **Poster layout** 的驱动；目前是 JMComic 和 ASMR.ONE。
_Avoid_: 白名单驱动

**Provider（驱动名）**:
提供当前目录的存储驱动的名称，由目录列表响应返回。

## Relationships

- 一个 **Work list** 包含多个 **Work**
- 当目录属于 **Poster provider** 并且是 **Work list**，且用户没有为该路径手动选择过 **Layout** 时，自动使用 **Poster layout**
- 用户手动选择的 **Layout** 总是优先于自动选择

## Example dialogue

> **Dev:** "ASMR.ONE 的 `RJ120000~RJ129999` 分段目录也用 **Poster layout** 吗？"
> **Domain expert:** "不用，它的子项没有封面，不是 **Work list**，保持用户的默认 **Layout**。"

## Flagged ambiguities

- "海报流"既被用来指 **Poster layout**，也被用来指整个站点的视觉风格。已定：只指 **Poster layout**；全站视觉改造不在当前范围内。
