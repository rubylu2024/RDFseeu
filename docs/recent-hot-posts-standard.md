# 近期热帖模块标准逻辑规范

## 1. 适用范围
- 标准来源页面：`index.html`
- 标准实现脚本：`script.js`
- 本次排查范围：全部非 `index` 页面

## 2. 页面排查清单
- `post.html`
  - 存在「近期热帖」模块
  - 修复前为静态写死链接
  - 本次已接入标准动态逻辑
- `__git_index_test.html`
  - 存在与首页同结构的测试模板
  - 原本已使用标准挂载点与共享脚本
  - 本次仅同步脚本版本号
- 其余业务页面
  - 未发现「近期热帖」或同类挂载模块
  - 无需改动

## 3. 标准挂载点约定
- 热帖榜容器：`#hot-topics-list`
- 近期热帖/最新发帖容器：`#recent-hot-list`
- 页面若不存在上述任一挂载点，不触发热帖模块请求

## 4. 初始化与触发时机
- 统一在 `DOMContentLoaded` 后触发
- 仅当页面存在 `#hot-topics-list` 或 `#recent-hot-list` 时执行 `renderDynamicHomeLinks()`
- 若接口未配置，直接渲染模块级提示文案，不发起请求

## 5. 接口调用规则
- 统一数据入口：`flarumLoadDiscussionList({ throwOnError: true })`
- 主请求：
  - `GET /api/discussions?sort=-createdAt&page[limit]=20&include=user&filter[q]=-is:private`
- 回退请求：
  - 当带过滤条件的请求拿不到公开主题时，退回
  - `GET /api/discussions?sort=-createdAt&page[limit]=20&include=user`
- 固定帖补拉：
  - 仅热帖榜需要时才按单帖接口补拉固定主题
  - `GET /api/discussions/{id}?include=user`

## 6. 请求参数与数据约定
- 排序：`sort=-createdAt`
- 数量：`page[limit]=20`
- 关联作者：`include=user`
- 公开过滤：`filter[q]=-is:private`
- 返回映射字段：
  - `id`
  - `title`
  - `author`
  - `date`
  - `views`

## 7. 数据解析流程
- 先通过 `filterPublicDiscussions()` 过滤私密讨论
- 从 `included` 中补齐作者信息
- 通过 `getDiscussionViewCount()` 兼容读取 `views` / `view_count` / `viewCount`
- 标准结果统一映射为前端列表对象：
  - `{ id, title, author, date, views }`

## 8. 前端渲染标准

### 8.1 热帖榜
- 仅在页面存在 `#hot-topics-list` 时渲染
- 总条数上限：12
- 组成规则：
  - 第 1 条固定为 `violation.html`
  - 第 2 条固定置顶帖，优先按 ID 命中，不存在时按标题关键字兜底
  - 第 3 至第 6 条取浏览量排序后的普通帖子
  - 第 7 条固定 HOT 帖，优先按 ID 命中，不存在时按标题关键字兜底
  - 第 8 至第 12 条继续按浏览量补齐
- 排序规则：
  - 先按 `views` 倒序
  - 浏览量相同按 `id` 倒序

### 8.2 近期热帖/最新发帖
- 仅在页面存在 `#recent-hot-list` 时渲染
- 取最近 20 条讨论
- 链接格式统一为：
  - `post.html?id={discussionId}`

## 9. 错误兜底与空态规范
- 请求失败：
  - `#hot-topics-list` 显示 `热帖加载失败，请稍后刷新重试`
  - `#recent-hot-list` 显示 `近期帖子加载失败，请稍后刷新重试`
- 空数据：
  - 热帖榜保留固定首条后，若无可用动态主题，补充 `暂无热帖`
  - 近期热帖列表显示 `暂无近期帖子`
- 渲染安全：
  - 所有标题统一经过 `escapeHtml()` 转义后写入 DOM

## 10. 分页与刷新机制
- 本模块当前无独立分页
- 本模块当前无独立自动刷新机制
- 刷新方式为页面重新加载后重新拉取接口

## 11. 本次修复说明
- `post.html`
  - 将静态写死的近期热帖列表替换为标准挂载点 `#recent-hot-list`
  - 接入与首页一致的动态拉取和兜底逻辑
- `script.js`
  - 将近期热帖列表渲染抽为公共函数
  - 仅在存在模块挂载点时才发起请求
  - 补充空数据与请求失败兜底
  - 统一链接渲染与标题转义
- `index.html`、`__git_index_test.html`
  - 同步脚本版本号，确保加载最新逻辑
